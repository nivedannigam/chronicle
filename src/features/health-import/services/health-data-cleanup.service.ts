import { supabase } from '@/lib/supabase'
import { invalidateHealthKnowledgeCache } from '@/features/health-knowledge/services/health-knowledge-cache'
import { listHealthSourceAssignments } from '@/features/family/services/health-sources.service'
import { HEALTH_REPORTS_BUCKET } from '@/features/health/types'

async function deleteStoragePaths(storagePaths: string[]) {
	const uniquePaths = [...new Set(storagePaths.filter(Boolean))]

	if (uniquePaths.length === 0) {
		return
	}

	const { error } = await supabase.storage
		.from(HEALTH_REPORTS_BUCKET)
		.remove(uniquePaths)

	if (error) {
		console.warn('Could not delete some storage files:', error.message)
	}
}

async function deleteHealthReportsByIds(reportIds: string[]) {
	if (reportIds.length === 0) {
		return
	}

	const { error } = await supabase
		.from('health_reports')
		.delete()
		.in('id', reportIds)

	if (error) {
		throw new Error(error.message)
	}
}

async function deleteRegistryForFolder(
	userId: string,
	folderId: string | null,
	externalFolderId: string,
) {
	let query = supabase
		.from('connector_document_registry')
		.select('id, health_report_id, external_file_id')
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')

	if (folderId) {
		query = query.eq('folder_id', folderId)
	} else {
		query = query.or(
			`folder_path.ilike.%${externalFolderId}%,external_file_id.eq.${externalFolderId}`,
		)
	}

	const { data: registryRows, error: fetchError } = await query

	if (fetchError) {
		throw new Error(fetchError.message)
	}

	return registryRows ?? []
}

export async function deleteImportedDataForExternalFolder(
	userId: string,
	externalFolderId: string,
	folderId?: string | null,
): Promise<{ reportsDeleted: number; registryDeleted: number }> {
	const rows = await deleteRegistryForFolder(
		userId,
		folderId ?? null,
		externalFolderId,
	)
	const reportIds = rows
		.map((row) => row.health_report_id as string | null)
		.filter((id): id is string => Boolean(id))

	const externalFileIds = rows.map((row) => row.external_file_id as string)

	let storagePaths: string[] = []

	if (reportIds.length > 0) {
		const { data: reports } = await supabase
			.from('health_reports')
			.select('id, storage_path')
			.in('id', reportIds)

		storagePaths = (reports ?? []).map(
			(report) => report.storage_path as string,
		)
	}

	if (externalFileIds.length > 0) {
		const { data: reportsByExternal } = await supabase
			.from('health_reports')
			.select('id, storage_path')
			.eq('user_id', userId)
			.in('external_file_id', externalFileIds)

		const extraIds = (reportsByExternal ?? []).map(
			(report) => report.id as string,
		)
		storagePaths = [
			...storagePaths,
			...(reportsByExternal ?? []).map(
				(report) => report.storage_path as string,
			),
		]
		reportIds.push(...extraIds.filter((id) => !reportIds.includes(id)))
	}

	await deleteStoragePaths(storagePaths)
	await deleteHealthReportsByIds([...new Set(reportIds)])

	if (rows.length > 0) {
		const { error: deleteRegistryError } = await supabase
			.from('connector_document_registry')
			.delete()
			.in(
				'id',
				rows.map((row) => row.id as string),
			)

		if (deleteRegistryError) {
			throw new Error(deleteRegistryError.message)
		}
	}

	const { error: graphError } = await supabase
		.from('health_knowledge_graphs')
		.delete()
		.eq('user_id', userId)

	if (graphError) {
		throw new Error(graphError.message)
	}

	invalidateHealthKnowledgeCache(userId)

	return { reportsDeleted: reportIds.length, registryDeleted: rows.length }
}

export async function removeHealthSourceAndData(
	userId: string,
	assignmentId: string,
): Promise<{ reportsDeleted: number; registryDeleted: number }> {
	const assignments = await listHealthSourceAssignments(userId)
	const assignment = assignments.find((item) => item.id === assignmentId)

	if (!assignment) {
		throw new Error('Health source assignment not found')
	}

	const result = await deleteImportedDataForExternalFolder(
		userId,
		assignment.externalFolderId,
		assignment.folderId,
	)

	const remainingForFolder = assignments.filter(
		(item) =>
			item.externalFolderId === assignment.externalFolderId &&
			item.id !== assignmentId,
	)

	const { error: assignmentError } = await supabase
		.from('health_folder_assignments')
		.delete()
		.eq('id', assignmentId)

	if (assignmentError) {
		throw new Error(assignmentError.message)
	}

	if (remainingForFolder.length === 0) {
		await supabase
			.from('connector_folders')
			.delete()
			.eq('user_id', userId)
			.eq('connector_id', 'google-drive')
			.eq('external_folder_id', assignment.externalFolderId)
	}

	return result
}

export async function resetAllImportedHealthData(userId: string): Promise<{
	reportsDeleted: number
	registryDeleted: number
}> {
	const { data: reports, error: reportsError } = await supabase
		.from('health_reports')
		.select('id, storage_path')
		.eq('user_id', userId)

	if (reportsError) {
		throw new Error(reportsError.message)
	}

	await deleteStoragePaths(
		(reports ?? []).map((report) => report.storage_path as string),
	)

	const { error: deleteReportsError } = await supabase
		.from('health_reports')
		.delete()
		.eq('user_id', userId)

	if (deleteReportsError) {
		throw new Error(deleteReportsError.message)
	}

	const { data: registryDeleted, error: registryError } = await supabase
		.from('connector_document_registry')
		.delete()
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
		.select('id')

	if (registryError) {
		throw new Error(registryError.message)
	}

	await supabase
		.from('connector_import_queue')
		.delete()
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')

	await supabase.from('health_knowledge_graphs').delete().eq('user_id', userId)

	invalidateHealthKnowledgeCache(userId)

	return {
		reportsDeleted: reports?.length ?? 0,
		registryDeleted: registryDeleted?.length ?? 0,
	}
}
