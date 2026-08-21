import { supabase } from '@/lib/supabase'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { isVehicleRegistryRow } from '@/features/connectors/services/registry-module-routing.service'
import { listVehicleSourceAssignments } from '@/features/family/services/vehicle-sources.service'
import { invalidateVehicleKnowledgeCache } from '@/features/vehicle-knowledge/services/vehicle-knowledge-cache'
import { runVehicleDiscovery } from '@/features/vehicle-import/services/vehicle-discovery-engine.service'
import {
	createVehicleDocumentFromRegistry,
	processVehicleDocument,
	reprocessStuckVehicleDocuments,
	resolveProvisionalVehicleId,
} from '@/features/vehicle-import/services/vehicle-processing.service'
import { classifyVehicleDocument } from '@/features/vehicle-knowledge/utils/vehicle-document-classifier'
import type {
	VehicleDiscoveryRunSummary,
	VehicleImportStatusSnapshot,
} from '@/features/vehicle-import/types/vehicle-import.types'

async function markVehicleRegistryImportFailed(
	registryId: string,
	reason: string,
): Promise<void> {
	await supabase
		.from('connector_document_registry')
		.update({
			import_status: 'failed',
			import_error: reason.slice(0, 500),
			updated_at: new Date().toISOString(),
		})
		.eq('id', registryId)
}

async function markVehicleDocumentFailed(
	documentId: string,
	reason: string,
): Promise<void> {
	await supabase
		.from('vehicle_documents')
		.update({
			status: 'failed',
			updated_at: new Date().toISOString(),
			parsed_data: {
				error: reason.slice(0, 500),
			},
		})
		.eq('id', documentId)
}

async function importDiscoveredVehicleFiles(userId: string): Promise<{
	imported: number
	failed: number
}> {
	const assignments = await listVehicleSourceAssignments(userId)
	const assignmentFolderIds = new Set(assignments.map((a) => a.folderId))
	const registry = await listRegistryRecords(userId, 'google-drive')
	const vehicleRows = registry.filter((row) => isVehicleRegistryRow(row))

	let imported = 0
	let failed = 0

	for (const row of vehicleRows) {
		if (row.vehicleDocumentId) {
			continue
		}

		if (row.folderId && !assignmentFolderIds.has(row.folderId)) {
			continue
		}

		const assignment =
			assignments.find((entry) => entry.folderId === row.folderId) ??
			assignments[0] ??
			null

		if (!assignment) {
			continue
		}

		let documentId: string | null = null

		try {
			const classification = classifyVehicleDocument({
				fileName: row.fileName,
				folderPath: row.folderPath,
			})
			const vehicleId = await resolveProvisionalVehicleId({
				userId,
				fileName: row.fileName,
				folderPath: row.folderPath,
				assignment,
				familyMemberId: row.familyMemberId ?? assignment.familyMemberId,
			})

			documentId = await createVehicleDocumentFromRegistry({
				userId,
				registryId: row.id,
				fileName: row.fileName,
				familyMemberId: row.familyMemberId ?? assignment.familyMemberId,
				folderAssignmentId: assignment.id,
				vehicleId,
				documentType: classification.documentType,
				documentSubtype: classification.documentSubtype,
			})

			await supabase
				.from('connector_document_registry')
				.update({
					vehicle_document_id: documentId,
					target_module: 'vehicles',
					import_status: 'processing',
					updated_at: new Date().toISOString(),
				})
				.eq('id', row.id)

			await processVehicleDocument({
				userId,
				documentId,
				fileName: row.fileName,
				folderPath: row.folderPath,
				assignment,
				registryId: row.id,
				externalFileId: row.externalFileId,
			})

			await supabase
				.from('connector_document_registry')
				.update({
					import_status: 'completed',
					imported_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				})
				.eq('id', row.id)

			imported += 1
		} catch (error) {
			failed += 1
			const reason =
				error instanceof Error ? error.message : 'Vehicle import failed'

			if (documentId) {
				await markVehicleDocumentFailed(documentId, reason)
			}

			await markVehicleRegistryImportFailed(row.id, reason)
		}
	}

	return { imported, failed }
}

export async function runVehicleImportSync(
	userId: string,
	options?: { skipDiscovery?: boolean },
): Promise<{
	discovered: number
	imported: number
	failed: number
}> {
	if (!options?.skipDiscovery) {
		await runVehicleDiscovery({ userId })
	}

	const { imported, failed } = await importDiscoveredVehicleFiles(userId)

	if (imported === 0 && failed === 0) {
		await reprocessStuckVehicleDocuments(userId)
	}

	invalidateVehicleKnowledgeCache(userId)

	return {
		discovered: imported,
		imported,
		failed,
	}
}

function mapDiscoveryRun(
	row: Record<string, unknown>,
): VehicleDiscoveryRunSummary {
	return {
		id: row.id as string,
		status: row.status as VehicleDiscoveryRunSummary['status'],
		startedAt: row.started_at as string,
		completedAt: (row.completed_at as string | null) ?? null,
		foldersScanned: Number(row.folders_scanned ?? 0),
		filesScanned: Number(row.files_scanned ?? 0),
		documentCount: Number(row.document_count ?? 0),
		duplicateCount: Number(row.duplicate_count ?? 0),
		errorMessage: (row.error_message as string | null) ?? null,
	}
}

export async function getVehicleImportStatus(
	userId: string,
): Promise<VehicleImportStatusSnapshot> {
	const { data: documents, error } = await supabase
		.from('vehicle_documents')
		.select('status')
		.eq('user_id', userId)

	if (error) {
		if (error.message.includes('vehicle_documents')) {
			return {
				isScanning: false,
				processingCount: 0,
				completedDocumentCount: 0,
				failedCount: 0,
				lastRun: null,
			}
		}

		throw new Error(error.message)
	}

	const rows = documents ?? []
	const processingCount = rows.filter((row) =>
		['uploaded', 'queued', 'processing', 'downloading'].includes(
			row.status as string,
		),
	).length
	const completedDocumentCount = rows.filter(
		(row) => row.status === 'completed',
	).length
	const failedCount = rows.filter((row) => row.status === 'failed').length

	const { data: lastRun } = await supabase
		.from('vehicle_discovery_runs')
		.select('*')
		.eq('user_id', userId)
		.order('started_at', { ascending: false })
		.limit(1)
		.maybeSingle()

	return {
		isScanning: processingCount > 0,
		processingCount,
		completedDocumentCount,
		failedCount,
		lastRun: lastRun
			? mapDiscoveryRun(lastRun as Record<string, unknown>)
			: null,
	}
}
