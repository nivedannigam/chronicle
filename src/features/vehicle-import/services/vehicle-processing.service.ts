import { supabase } from '@/lib/supabase'
import { classifyVehicleDocument } from '@/features/vehicle-knowledge/utils/vehicle-document-classifier'
import {
	inferVehicleCategory,
	resolveVehicleNameFromPath,
	slugifyVehicleName,
} from '@/features/vehicle-knowledge/utils/vehicle-folder-resolver'
import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'
import type { VehicleFactKey } from '@/features/vehicle-knowledge/types/vehicle-knowledge.types'
import type { VehicleSourceAssignment } from '@/features/family/services/vehicle-sources.service'

const DATE_PATTERN =
	/(20\d{2}|19\d{2})[-_/.\s](0?[1-9]|1[0-2])[-_/.\s](0?[1-9]|[12]\d|3[01])/

function parseDateFromText(text: string): string | null {
	const match = text.match(DATE_PATTERN)

	if (!match) {
		return null
	}

	const year = match[1]
	const month = match[2].padStart(2, '0')
	const day = match[3].padStart(2, '0')

	return `${year}-${month}-${day}`
}

function parseRegistrationNumber(text: string): string | null {
	const match = text.match(/\b([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{1,4})\b/i)

	return match ? match[1].replace(/\s+/g, ' ').toUpperCase() : null
}

function inferExpiryDate(text: string): string | null {
	if (!/(expiry|expires|valid\s*until|valid\s*till)/i.test(text)) {
		return null
	}

	return parseDateFromText(text)
}

function timelineEventForDocument(input: {
	documentType: VehicleDocumentTypeId
	documentSubtype: string
	documentDate: string | null
	expiryDate: string | null
}): {
	eventType: string
	title: string
	description: string | null
	eventDate: string
} | null {
	switch (input.documentType) {
		case 'purchase_finance':
			if (!input.documentDate) return null
			return {
				eventType: 'vehicle_purchased',
				title: 'Vehicle purchased',
				description: null,
				eventDate: input.documentDate,
			}
		case 'registration':
			if (!input.documentDate) return null
			return {
				eventType: 'registration_issued',
				title: 'Registration recorded',
				description: null,
				eventDate: input.documentDate,
			}
		case 'insurance':
			if (/renew/i.test(input.documentSubtype) && input.documentDate) {
				return {
					eventType: 'insurance_renewed',
					title: 'Insurance renewed',
					description: null,
					eventDate: input.documentDate,
				}
			}

			if (input.documentDate) {
				return {
					eventType: 'insurance_started',
					title: 'Insurance started',
					description: null,
					eventDate: input.documentDate,
				}
			}

			return null
		case 'compliance':
			if (input.documentSubtype === 'puc' && input.documentDate) {
				return {
					eventType: 'puc_renewed',
					title: 'PUC renewed',
					description: null,
					eventDate: input.documentDate,
				}
			}

			return null
		case 'service':
			if (!input.documentDate) return null
			return {
				eventType: 'service_completed',
				title: 'Vehicle serviced',
				description: null,
				eventDate: input.documentDate,
			}
		case 'warranty':
			if (!input.documentDate) return null
			return {
				eventType: 'warranty_started',
				title: 'Warranty recorded',
				description: null,
				eventDate: input.documentDate,
			}
		default:
			return null
	}
}

async function ensureVehicle(input: {
	userId: string
	displayName: string
	familyMemberId: string | null
}): Promise<string> {
	const slug = slugifyVehicleName(input.displayName)
	const now = new Date().toISOString()

	const { data: existing } = await supabase
		.from('vehicles')
		.select('id')
		.eq('user_id', input.userId)
		.eq('slug', slug)
		.maybeSingle()

	if (existing?.id) {
		return existing.id as string
	}

	const { data, error } = await supabase
		.from('vehicles')
		.insert({
			user_id: input.userId,
			family_member_id: input.familyMemberId,
			display_name: input.displayName,
			slug,
			category: inferVehicleCategory(input.displayName),
			status: 'active',
			source: 'folder_discovery',
			updated_at: now,
		})
		.select('id')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return data.id as string
}

async function upsertFacts(input: {
	userId: string
	vehicleId: string
	documentId: string
	facts: Array<{
		factKey: VehicleFactKey | string
		factValue: string | null
		valueDate?: string | null
		valueNumber?: number | null
	}>
}) {
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
			confidence: 0.55,
			source: 'deterministic',
		})
	}
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
}): Promise<void> {
	const classification = classifyVehicleDocument({
		fileName: input.fileName,
		folderPath: input.folderPath,
	})
	const searchable = `${input.fileName} ${input.folderPath ?? ''}`
	const documentDate = parseDateFromText(searchable)
	const expiryDate = inferExpiryDate(searchable)
	const registrationNumber = parseRegistrationNumber(searchable)
	const vehicleName = resolveVehicleNameFromPath({
		folderPath: input.folderPath,
		rootFolderPath: input.assignment.folderPath,
		rootFolderName: input.assignment.folderName,
	})
	const vehicleId = await ensureVehicle({
		userId: input.userId,
		displayName: vehicleName,
		familyMemberId: input.assignment.familyMemberId,
	})
	const now = new Date().toISOString()

	const facts: Array<{
		factKey: VehicleFactKey | string
		factValue: string | null
		valueDate?: string | null
	}> = []

	if (registrationNumber) {
		facts.push({
			factKey: 'registration_number',
			factValue: registrationNumber,
		})

		await supabase
			.from('vehicles')
			.update({
				registration_number: registrationNumber,
				updated_at: now,
			})
			.eq('id', vehicleId)
	}

	if (documentDate && classification.documentType === 'purchase_finance') {
		facts.push({
			factKey: 'purchase_date',
			factValue: documentDate,
			valueDate: documentDate,
		})
	}

	if (expiryDate && classification.documentType === 'insurance') {
		facts.push({
			factKey: 'policy_expiry',
			factValue: expiryDate,
			valueDate: expiryDate,
		})
	}

	if (expiryDate && classification.documentSubtype === 'puc') {
		facts.push({
			factKey: 'puc_expiry',
			factValue: expiryDate,
			valueDate: expiryDate,
		})
	}

	if (expiryDate && classification.documentType === 'warranty') {
		facts.push({
			factKey: 'warranty_expiry',
			factValue: expiryDate,
			valueDate: expiryDate,
		})
	}

	if (documentDate && classification.documentType === 'service') {
		facts.push({
			factKey: 'service_date',
			factValue: documentDate,
			valueDate: documentDate,
		})
	}

	await upsertFacts({
		userId: input.userId,
		vehicleId,
		documentId: input.documentId,
		facts,
	})

	const timelineEvent = timelineEventForDocument({
		documentType: classification.documentType,
		documentSubtype: classification.documentSubtype,
		documentDate,
		expiryDate,
	})

	if (timelineEvent) {
		await supabase.from('vehicle_timeline_events').insert({
			user_id: input.userId,
			vehicle_id: vehicleId,
			document_id: input.documentId,
			event_type: timelineEvent.eventType,
			title: timelineEvent.title,
			description: timelineEvent.description,
			event_date: timelineEvent.eventDate,
			evidence_ids: [`document-${input.documentId}`],
		})
	}

	await supabase
		.from('vehicle_documents')
		.update({
			vehicle_id: vehicleId,
			document_type: classification.documentType,
			document_subtype: classification.documentSubtype,
			status: 'completed',
			document_date: documentDate,
			expiry_date: expiryDate,
			processed_at: now,
			parsed_data: {
				classification,
				registrationNumber,
			},
			updated_at: now,
		})
		.eq('id', input.documentId)
}
