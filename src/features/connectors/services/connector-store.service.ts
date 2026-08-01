import { supabase } from '@/lib/supabase'
import {
	isUnauthorizedSupabaseError,
	requireSupabaseSession,
	SupabaseAuthRequiredError,
} from '@/lib/supabase-session'
import {
	isMissingSchemaError,
	missingSchemaMessage,
} from '@/features/connectors/services/connector-schema.utils'
import type {
	ConnectorConnectionStatus,
	ConnectorDocumentRecord,
	ConnectorFolder,
	ConnectorId,
	ConnectorSyncRun,
	ImportQueueStatus,
} from '@/core/connectors'

function mapFolder(row: Record<string, unknown>): ConnectorFolder {
	return {
		id: row.id as string,
		connectorId: row.connector_id as ConnectorId,
		userId: row.user_id as string,
		externalFolderId: row.external_folder_id as string,
		displayName: row.display_name as string,
		alias: row.alias as string,
		enabled: row.enabled as boolean,
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
	}
}

function mapRegistry(row: Record<string, unknown>): ConnectorDocumentRecord {
	return {
		id: row.id as string,
		userId: row.user_id as string,
		connectorId: row.connector_id as ConnectorId,
		externalFileId: row.external_file_id as string,
		fileName: row.file_name as string,
		mimeType: row.mime_type as string,
		checksum: row.checksum as string,
		fileSize: Number(row.file_size ?? 0),
		externalCreatedAt: (row.external_created_at as string | null) ?? null,
		externalModifiedAt: (row.external_modified_at as string | null) ?? null,
		folderId: (row.folder_id as string | null) ?? null,
		importedAt: (row.imported_at as string | null) ?? null,
		lastSyncAt: (row.last_sync_at as string | null) ?? null,
		registryStatus:
			row.registry_status as ConnectorDocumentRecord['registryStatus'],
		importStatus: row.import_status as ImportQueueStatus,
		healthReportId: (row.health_report_id as string | null) ?? null,
		knowledgeGraphStatus: (row.knowledge_graph_status as string | null) ?? null,
		errorMessage: (row.error_message as string | null) ?? null,
		familyMemberId: (row.family_member_id as string | null) ?? null,
		folderPath: (row.folder_path as string | null) ?? null,
		discoveryCategory:
			(row.discovery_category as ConnectorDocumentRecord['discoveryCategory']) ??
			null,
		discoveryConfidence:
			row.discovery_confidence != null
				? Number(row.discovery_confidence)
				: null,
		discoveryReason: (row.discovery_reason as string | null) ?? null,
		sha256Checksum: (row.sha256_checksum as string | null) ?? null,
		approvalStatus:
			(row.approval_status as ConnectorDocumentRecord['approvalStatus']) ??
			null,
		detectedPatient: (row.detected_patient as string | null) ?? null,
		detectedReportDate: (row.detected_report_date as string | null) ?? null,
		detectedReportType: (row.detected_report_type as string | null) ?? null,
	}
}

function mapSyncRun(row: Record<string, unknown>): ConnectorSyncRun {
	return {
		id: row.id as string,
		userId: row.user_id as string,
		connectorId: row.connector_id as ConnectorId,
		mode: row.mode as ConnectorSyncRun['mode'],
		status: row.status as ConnectorSyncRun['status'],
		startedAt: row.started_at as string,
		completedAt: (row.completed_at as string | null) ?? null,
		filesDiscovered: Number(row.files_discovered ?? 0),
		filesQueued: Number(row.files_queued ?? 0),
		filesImported: Number(row.files_imported ?? 0),
		filesFailed: Number(row.files_failed ?? 0),
		errorMessage: (row.error_message as string | null) ?? null,
	}
}

export async function getConnectorConnection(
	userId: string,
	connectorId: ConnectorId,
) {
	let session

	try {
		session = await requireSupabaseSession()
	} catch (error) {
		if (error instanceof SupabaseAuthRequiredError) {
			return null
		}

		throw error
	}

	if (session.user.id !== userId) {
		throw new Error('Session user does not match requested connector user.')
	}

	const { data, error } = await supabase
		.from('connector_connections')
		.select('*')
		.eq('user_id', userId)
		.eq('connector_id', connectorId)
		.maybeSingle()

	if (error) {
		if (isMissingSchemaError(error) || isUnauthorizedSupabaseError(error)) {
			return null
		}

		throw new Error(error.message)
	}

	return data as Record<string, unknown> | null
}

export async function upsertConnectorConnection(input: {
	userId: string
	connectorId: ConnectorId
	status: ConnectorConnectionStatus
	scopes?: string[]
	lastError?: string | null
	settings?: Record<string, unknown>
	clearConnection?: boolean
}) {
	const connectedAt =
		input.status === 'connected'
			? new Date().toISOString()
			: input.clearConnection
				? null
				: undefined

	const payload: Record<string, unknown> = {
		user_id: input.userId,
		connector_id: input.connectorId,
		status: input.status,
		scopes: input.scopes ?? [],
		last_error: input.lastError ?? null,
		updated_at: new Date().toISOString(),
	}

	if (connectedAt !== undefined) {
		payload.connected_at = connectedAt
	}

	if (input.settings !== undefined) {
		payload.settings = input.settings
	}

	if (input.clearConnection) {
		payload.settings = {}
	}

	const { data, error } = await supabase
		.from('connector_connections')
		.upsert(payload, { onConflict: 'user_id,connector_id' })
		.select('*')
		.single()

	if (error) {
		if (isMissingSchemaError(error)) {
			throw new Error(missingSchemaMessage())
		}

		throw new Error(error.message)
	}

	return data
}

export async function listConnectorFolders(
	userId: string,
	connectorId: ConnectorId,
) {
	const { data, error } = await supabase
		.from('connector_folders')
		.select('*')
		.eq('user_id', userId)
		.eq('connector_id', connectorId)
		.order('created_at', { ascending: true })

	if (error) {
		if (isMissingSchemaError(error)) {
			return []
		}

		throw new Error(error.message)
	}

	return (data ?? []).map((row) => mapFolder(row as Record<string, unknown>))
}

export async function saveConnectorFolder(input: {
	userId: string
	connectorId: ConnectorId
	externalFolderId: string
	displayName: string
	alias: string
	enabled?: boolean
}) {
	const { data, error } = await supabase
		.from('connector_folders')
		.upsert(
			{
				user_id: input.userId,
				connector_id: input.connectorId,
				external_folder_id: input.externalFolderId,
				display_name: input.displayName,
				alias: input.alias,
				enabled: input.enabled ?? true,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: 'user_id,connector_id,external_folder_id' },
		)
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return mapFolder(data as Record<string, unknown>)
}

export async function updateConnectorFolder(
	folderId: string,
	updates: Partial<Pick<ConnectorFolder, 'alias' | 'enabled'>>,
) {
	const { error } = await supabase
		.from('connector_folders')
		.update({
			alias: updates.alias,
			enabled: updates.enabled,
			updated_at: new Date().toISOString(),
		})
		.eq('id', folderId)

	if (error) {
		throw new Error(error.message)
	}
}

export async function removeConnectorFolder(folderId: string) {
	const { error } = await supabase
		.from('connector_folders')
		.delete()
		.eq('id', folderId)

	if (error) {
		throw new Error(error.message)
	}
}

export async function findRegistryByExternalFileId(
	userId: string,
	connectorId: ConnectorId,
	externalFileId: string,
) {
	const { data, error } = await supabase
		.from('connector_document_registry')
		.select('*')
		.eq('user_id', userId)
		.eq('connector_id', connectorId)
		.eq('external_file_id', externalFileId)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return data ? mapRegistry(data as Record<string, unknown>) : null
}

export async function upsertRegistryRecord(input: {
	userId: string
	connectorId: ConnectorId
	externalFileId: string
	fileName: string
	mimeType: string
	checksum: string
	fileSize: number
	externalCreatedAt?: string
	externalModifiedAt?: string
	folderId?: string | null
	familyMemberId?: string | null
	folderPath?: string | null
	discoveryCategory?: ConnectorDocumentRecord['discoveryCategory']
	discoveryConfidence?: number
	discoveryReason?: string
	approvalStatus?: ConnectorDocumentRecord['approvalStatus']
}) {
	const { data, error } = await supabase
		.from('connector_document_registry')
		.upsert(
			{
				user_id: input.userId,
				connector_id: input.connectorId,
				external_file_id: input.externalFileId,
				file_name: input.fileName,
				mime_type: input.mimeType,
				checksum: input.checksum,
				file_size: input.fileSize,
				external_created_at: input.externalCreatedAt ?? null,
				external_modified_at: input.externalModifiedAt ?? null,
				folder_id: input.folderId ?? null,
				family_member_id: input.familyMemberId ?? null,
				folder_path: input.folderPath ?? null,
				discovery_category: input.discoveryCategory ?? null,
				discovery_confidence: input.discoveryConfidence ?? null,
				discovery_reason: input.discoveryReason ?? null,
				approval_status: input.approvalStatus ?? null,
				last_sync_at: new Date().toISOString(),
				registry_status: 'discovered',
				import_status: 'discovered',
				updated_at: new Date().toISOString(),
			},
			{ onConflict: 'user_id,connector_id,external_file_id' },
		)
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return mapRegistry(data as Record<string, unknown>)
}

export async function updateRegistryRecord(
	registryId: string,
	updates: Partial<{
		importStatus: ImportQueueStatus
		registryStatus: ConnectorDocumentRecord['registryStatus']
		healthReportId: string | null
		knowledgeGraphStatus: string | null
		importedAt: string | null
		errorMessage: string | null
	}>,
) {
	const { error } = await supabase
		.from('connector_document_registry')
		.update({
			import_status: updates.importStatus,
			registry_status: updates.registryStatus,
			health_report_id: updates.healthReportId,
			knowledge_graph_status: updates.knowledgeGraphStatus,
			imported_at: updates.importedAt,
			error_message: updates.errorMessage,
			last_sync_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('id', registryId)

	if (error) {
		throw new Error(error.message)
	}
}

export async function listRegistryRecords(
	userId: string,
	connectorId: ConnectorId,
) {
	const { data, error } = await supabase
		.from('connector_document_registry')
		.select('*')
		.eq('user_id', userId)
		.eq('connector_id', connectorId)
		.order('updated_at', { ascending: false })

	if (error) {
		if (isMissingSchemaError(error)) {
			return []
		}

		throw new Error(error.message)
	}

	return (data ?? []).map((row) => mapRegistry(row as Record<string, unknown>))
}

export async function enqueueImportItem(input: {
	userId: string
	connectorId: ConnectorId
	registryId: string
}) {
	const { data, error } = await supabase
		.from('connector_import_queue')
		.insert({
			user_id: input.userId,
			connector_id: input.connectorId,
			registry_id: input.registryId,
			status: 'queued',
		})
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	await updateRegistryRecord(input.registryId, { importStatus: 'queued' })

	return data
}

export async function listImportQueue(
	userId: string,
	connectorId: ConnectorId,
) {
	const { data, error } = await supabase
		.from('connector_import_queue')
		.select('*')
		.eq('user_id', userId)
		.eq('connector_id', connectorId)
		.order('created_at', { ascending: false })
		.limit(100)

	if (error) {
		throw new Error(error.message)
	}

	return data ?? []
}

export async function createSyncRun(input: {
	userId: string
	connectorId: ConnectorId
	mode: ConnectorSyncRun['mode']
}) {
	const { data, error } = await supabase
		.from('connector_sync_runs')
		.insert({
			user_id: input.userId,
			connector_id: input.connectorId,
			mode: input.mode,
			status: 'running',
		})
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return mapSyncRun(data as Record<string, unknown>)
}

export async function completeSyncRun(
	syncRunId: string,
	updates: Partial<ConnectorSyncRun> & { status: ConnectorSyncRun['status'] },
) {
	const { error } = await supabase
		.from('connector_sync_runs')
		.update({
			status: updates.status,
			completed_at: new Date().toISOString(),
			files_discovered: updates.filesDiscovered,
			files_queued: updates.filesQueued,
			files_imported: updates.filesImported,
			files_failed: updates.filesFailed,
			error_message: updates.errorMessage ?? null,
		})
		.eq('id', syncRunId)

	if (error) {
		throw new Error(error.message)
	}
}

export async function getLatestSyncRun(
	userId: string,
	connectorId: ConnectorId,
) {
	const { data, error } = await supabase
		.from('connector_sync_runs')
		.select('*')
		.eq('user_id', userId)
		.eq('connector_id', connectorId)
		.order('started_at', { ascending: false })
		.limit(1)
		.maybeSingle()

	if (error) {
		if (isMissingSchemaError(error)) {
			return null
		}

		throw new Error(error.message)
	}

	return data ? mapSyncRun(data as Record<string, unknown>) : null
}

export async function updateConnectorLastSync(
	userId: string,
	connectorId: ConnectorId,
) {
	const { error } = await supabase
		.from('connector_connections')
		.update({
			last_sync_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('user_id', userId)
		.eq('connector_id', connectorId)

	if (error) {
		throw new Error(error.message)
	}
}

export function buildFileFingerprint(input: {
	externalFileId: string
	modifiedAt: string
	fileSize: number
}): string {
	return `${input.externalFileId}:${input.modifiedAt}:${input.fileSize}`
}
