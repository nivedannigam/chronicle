import { supabase } from '@/lib/supabase'
import type { ConnectorSyncRun } from '@/core/connectors'
import type { HealthImportHistoryEntry } from '@/features/health-import/types/health-import.types'

function mapSyncRunToHistory(run: ConnectorSyncRun): HealthImportHistoryEntry {
	const started = new Date(run.startedAt).getTime()
	const completed = run.completedAt
		? new Date(run.completedAt).getTime()
		: started

	return {
		id: run.id,
		importDate: run.startedAt,
		durationMs: Math.max(0, completed - started),
		reportsAdded: run.filesImported,
		reportsUpdated: 0,
		reportsSkipped: Math.max(0, run.filesDiscovered - run.filesQueued),
		reportsFailed: run.filesFailed,
		status:
			run.status === 'running' || run.status === 'pending'
				? 'partial'
				: run.status === 'partial'
					? 'partial'
					: run.status === 'failed'
						? 'failed'
						: 'completed',
	}
}

export async function listImportHistory(
	userId: string,
): Promise<HealthImportHistoryEntry[]> {
	const { data, error } = await supabase
		.from('connector_sync_runs')
		.select('*')
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
		.order('started_at', { ascending: false })
		.limit(20)

	if (error) {
		throw new Error(error.message)
	}

	return (data ?? []).map((row) =>
		mapSyncRunToHistory({
			id: row.id,
			userId: row.user_id,
			connectorId: 'google-drive',
			mode: row.mode,
			status: row.status,
			startedAt: row.started_at,
			completedAt: row.completed_at,
			filesDiscovered: row.files_discovered,
			filesQueued: row.files_queued,
			filesImported: row.files_imported,
			filesFailed: row.files_failed,
			errorMessage: row.error_message,
		}),
	)
}
