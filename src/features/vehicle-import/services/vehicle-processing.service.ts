import { supabase } from '@/lib/supabase'
import { extractRegistryDocumentForDomain } from '@/features/document-import/services/domain-document-extraction.service'
import {
	extractVehicleDocument,
	timelineEventForExtraction,
	type VehicleDocumentExtraction,
} from '@/features/vehicle-knowledge/extraction/vehicle-document-extraction.service'
import {
	listUserVehicles,
	resolveVehicleForDocument,
	updateVehicleIdentityFromExtraction,
} from '@/features/vehicle-knowledge/services/vehicle-identity.service'
import { resolveVehicleNameFromPath } from '@/features/vehicle-knowledge/utils/vehicle-folder-resolver'
import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'
import type { VehicleFactKey } from '@/features/vehicle-knowledge/types/vehicle-knowledge.types'
import {
	listVehicleSourceAssignments,
	type VehicleSourceAssignment,
} from '@/features/family/services/vehicle-sources.service'
import type { DomainDocumentExtractionResult } from '@/shared/ai/types/domain-document-extraction.types'
import { isAiStructuredExtractionMethod } from '@/shared/ai/types/document-extraction.types'
import { invalidateVehicleKnowledgeCache } from '@/features/vehicle-knowledge/services/vehicle-knowledge-cache'

function mergeDomainVehicleExtraction(input: {
	fileName: string
	folderPath?: string | null
	domainResult: DomainDocumentExtractionResult
}): VehicleDocumentExtraction {
	const base = extractVehicleDocument({
		fileName: input.fileName,
		folderPath: input.folderPath,
		text: input.domainResult.extractedText,
	})
	const ai = input.domainResult.vehicle

	if (!ai || !isAiStructuredExtractionMethod(input.domainResult.method)) {
		return base
	}

	const aiFacts = ai.facts.map((fact) => ({
		factKey: fact.factKey,
		factValue: fact.factValue,
		valueDate: fact.valueDate ?? null,
		valueNumber: fact.valueNumber ?? null,
		rawValue: fact.factValue,
		confidence: ai.confidence,
	}))

	const factKeys = new Set(aiFacts.map((fact) => fact.factKey))
	const mergedFacts = [
		...aiFacts,
		...base.facts.filter((fact) => !factKeys.has(fact.factKey)),
	]

	return {
		...base,
		documentType: ai.documentType ?? base.documentType,
		documentSubtype: ai.documentSubtype ?? base.documentSubtype,
		documentDate: ai.documentDate ?? base.documentDate,
		expiryDate: ai.expiryDate ?? base.expiryDate,
		provider: ai.provider ?? base.provider,
		identifiers: {
			registrationNumber:
				ai.registrationNumber ?? base.identifiers.registrationNumber,
			vin: ai.vin ?? base.identifiers.vin,
			engineNumber: ai.engineNumber ?? base.identifiers.engineNumber,
		},
		make: ai.make ?? base.make,
		model: ai.model ?? base.model,
		variant: ai.variant ?? base.variant,
		facts: mergedFacts,
		extractionMethod: 'content',
		confidence: Math.max(base.confidence, ai.confidence),
		rawFields: {
			...base.rawFields,
			...Object.fromEntries(
				Object.entries(ai.rawFields).map(([key, value]) => [
					key,
					value == null ? '' : String(value),
				]),
			),
		},
	}
}

async function loadVehicleExtraction(input: {
	userId: string
	documentId: string
	fileName: string
	folderPath?: string | null
	registryId?: string | null
	externalFileId?: string | null
	text?: string | null
	storagePath?: string | null
}): Promise<{
	extraction: VehicleDocumentExtraction
	domainResult: DomainDocumentExtractionResult | null
	storagePath: string | null
}> {
	if (input.registryId && input.externalFileId) {
		const { download, extraction: domainResult } =
			await extractRegistryDocumentForDomain({
				target: 'vehicles',
				userId: input.userId,
				registryId: input.registryId,
				externalFileId: input.externalFileId,
				fileName: input.fileName,
				folderPath: input.folderPath,
				documentId: input.documentId,
				storagePath: input.storagePath ?? null,
			})

		return {
			extraction: mergeDomainVehicleExtraction({
				fileName: input.fileName,
				folderPath: input.folderPath,
				domainResult,
			}),
			domainResult,
			storagePath: download?.storagePath ?? input.storagePath ?? null,
		}
	}

	return {
		extraction: extractVehicleDocument({
			fileName: input.fileName,
			folderPath: input.folderPath,
			text: input.text,
		}),
		domainResult: null,
		storagePath: input.storagePath ?? null,
	}
}

async function replaceFactsForDocument(input: {
	userId: string
	vehicleId: string
	documentId: string
	facts: Array<{
		factKey: VehicleFactKey | string
		factValue: string | null
		valueDate?: string | null
		valueNumber?: number | null
		confidence?: number
	}>
	extractionMethod: string
}) {
	await supabase
		.from('vehicle_facts')
		.delete()
		.eq('document_id', input.documentId)

	for (const fact of input.facts) {
		if (!fact.factValue && !fact.valueDate && fact.valueNumber == null) {
			continue
		}

		await supabase.from('vehicle_facts').insert({
			user_id: input.userId,
			vehicle_id: input.vehicleId,
			document_id: input.documentId,
			fact_key: fact.factKey,
			fact_value: fact.factValue,
			value_date: fact.valueDate ?? null,
			value_number: fact.valueNumber ?? null,
			confidence: fact.confidence ?? 0.72,
			source: input.extractionMethod,
		})
	}
}

async function replaceTimelineForDocument(input: {
	userId: string
	vehicleId: string
	documentId: string
	event: {
		eventType: string
		title: string
		description: string | null
		eventDate: string
	} | null
}) {
	await supabase
		.from('vehicle_timeline_events')
		.delete()
		.eq('document_id', input.documentId)

	if (!input.event) {
		return
	}

	await supabase.from('vehicle_timeline_events').insert({
		user_id: input.userId,
		vehicle_id: input.vehicleId,
		document_id: input.documentId,
		event_type: input.event.eventType,
		title: input.event.title,
		description: input.event.description,
		event_date: input.event.eventDate,
		evidence_ids: [`document-${input.documentId}`],
	})
}

export async function createVehicleDocumentFromRegistry(input: {
	userId: string
	registryId: string
	fileName: string
	familyMemberId: string | null
	folderAssignmentId: string | null
	vehicleId: string
	documentType: VehicleDocumentTypeId
	documentSubtype: string
}): Promise<string> {
	const now = new Date().toISOString()

	const { data, error } = await supabase
		.from('vehicle_documents')
		.insert({
			user_id: input.userId,
			vehicle_id: input.vehicleId,
			family_member_id: input.familyMemberId,
			folder_assignment_id: input.folderAssignmentId,
			registry_id: input.registryId,
			file_name: input.fileName,
			document_type: input.documentType,
			document_subtype: input.documentSubtype,
			status: 'processing',
			uploaded_at: now,
			updated_at: now,
		})
		.select('id')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return data.id as string
}

export async function processVehicleDocument(input: {
	userId: string
	documentId: string
	fileName: string
	folderPath?: string | null
	assignment: VehicleSourceAssignment
	text?: string | null
	registryId?: string | null
	externalFileId?: string | null
	storagePath?: string | null
}): Promise<void> {
	let storagePath = input.storagePath ?? null

	if (!storagePath) {
		const { data: existingDocument } = await supabase
			.from('vehicle_documents')
			.select('storage_path')
			.eq('id', input.documentId)
			.maybeSingle()

		storagePath = (existingDocument?.storage_path as string | null) ?? null
	}

	const {
		extraction,
		domainResult,
		storagePath: resolvedStoragePath,
	} = await loadVehicleExtraction({
		...input,
		storagePath,
	})
	const folderVehicleName = resolveVehicleNameFromPath({
		folderPath: input.folderPath,
		rootFolderPath: input.assignment.folderPath,
		rootFolderName: input.assignment.folderName,
	})
	const vehicles = await listUserVehicles(input.userId)
	const resolved = await resolveVehicleForDocument({
		userId: input.userId,
		familyMemberId: input.assignment.familyMemberId,
		folderVehicleName,
		extraction,
		vehicles,
	})
	const vehicleId = resolved.vehicleId
	const now = new Date().toISOString()

	await replaceFactsForDocument({
		userId: input.userId,
		vehicleId,
		documentId: input.documentId,
		facts: extraction.facts,
		extractionMethod: extraction.extractionMethod,
	})

	await updateVehicleIdentityFromExtraction({
		vehicleId,
		extraction,
		documentType: extraction.documentType,
	})

	const timelineEvent = timelineEventForExtraction({
		documentType: extraction.documentType,
		documentSubtype: extraction.documentSubtype,
		documentDate: extraction.documentDate,
		expiryDate: extraction.expiryDate,
	})

	await replaceTimelineForDocument({
		userId: input.userId,
		vehicleId,
		documentId: input.documentId,
		event: timelineEvent,
	})

	await supabase
		.from('vehicle_documents')
		.update({
			vehicle_id: vehicleId,
			document_type: extraction.documentType,
			document_subtype: extraction.documentSubtype,
			status: 'completed',
			storage_path: resolvedStoragePath,
			document_date: extraction.documentDate,
			expiry_date: extraction.expiryDate,
			processed_at: now,
			parsed_data: {
				extraction,
				match: resolved,
				identifiers: extraction.identifiers,
				provider: extraction.provider,
				domainExtraction: domainResult,
				extractedText: domainResult?.extractedText ?? input.text ?? null,
			},
			updated_at: now,
		})
		.eq('id', input.documentId)
}

export async function resolveProvisionalVehicleId(input: {
	userId: string
	fileName: string
	folderPath?: string | null
	assignment: VehicleSourceAssignment
	familyMemberId: string | null
}): Promise<string> {
	const extraction = extractVehicleDocument({
		fileName: input.fileName,
		folderPath: input.folderPath,
	})
	const folderVehicleName = resolveVehicleNameFromPath({
		folderPath: input.folderPath,
		rootFolderPath: input.assignment.folderPath,
		rootFolderName: input.assignment.folderName,
	})
	const vehicles = await listUserVehicles(input.userId)
	const resolved = await resolveVehicleForDocument({
		userId: input.userId,
		familyMemberId: input.familyMemberId,
		folderVehicleName,
		extraction,
		vehicles,
	})

	return resolved.vehicleId
}

function vehicleDocumentNeedsReprocess(
	parsedData: Record<string, unknown> | null,
): boolean {
	const extraction = parsedData?.extraction as
		DomainDocumentExtractionResult | undefined
	const domainExtraction = parsedData?.domainExtraction as
		DomainDocumentExtractionResult | undefined
	const resolvedExtraction = domainExtraction ?? extraction

	if (!resolvedExtraction) {
		return true
	}

	if (resolvedExtraction.method !== 'llm') {
		return true
	}

	const vehicle = resolvedExtraction.vehicle
	if (!vehicle?.registrationNumber && !vehicle?.vin) {
		return true
	}

	return false
}

export async function reprocessStuckVehicleDocuments(
	userId: string,
): Promise<{ processed: number; failed: number; succeeded: number }> {
	const { data: documents, error } = await supabase
		.from('vehicle_documents')
		.select(
			'id, file_name, storage_path, registry_id, parsed_data, status, vehicle_id',
		)
		.eq('user_id', userId)

	if (error) {
		throw new Error(error.message)
	}

	const assignments = await listVehicleSourceAssignments(userId)
	const registryRows =
		(
			await supabase
				.from('connector_document_registry')
				.select('id, external_file_id, folder_path, folder_id')
				.eq('user_id', userId)
		).data ?? []

	const registryById = new Map(
		registryRows.map((row) => [
			row.id as string,
			row as Record<string, unknown>,
		]),
	)

	let processed = 0
	let failed = 0
	let succeeded = 0

	for (const row of documents ?? []) {
		if ((row.status as string) === 'failed') {
			// still attempt reprocess below
		}

		const parsedData =
			(row.parsed_data as Record<string, unknown> | null) ?? null

		if (!vehicleDocumentNeedsReprocess(parsedData) && row.status !== 'failed') {
			continue
		}

		const registryId = row.registry_id as string | null
		const registry = registryId ? registryById.get(registryId) : null

		if (!registry?.external_file_id) {
			continue
		}

		const assignment =
			assignments.find(
				(entry) => entry.folderId === (registry.folder_id as string | null),
			) ??
			assignments[0] ??
			null

		if (!assignment) {
			continue
		}

		processed += 1

		try {
			await processVehicleDocument({
				userId,
				documentId: row.id as string,
				fileName: row.file_name as string,
				folderPath: (registry.folder_path as string | null) ?? null,
				assignment,
				registryId,
				externalFileId: registry.external_file_id as string,
				storagePath: (row.storage_path as string | null) ?? null,
			})
			succeeded += 1
		} catch {
			failed += 1
		}
	}

	if (processed > 0) {
		invalidateVehicleKnowledgeCache(userId)
	}

	return { processed, failed, succeeded }
}
