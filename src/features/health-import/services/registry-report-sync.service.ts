import { updateRegistryRecord } from '@/features/connectors/services/connector-store.service'
import { supabase } from '@/lib/supabase'

async function findRegistryIdForReport(
	reportId: string,
): Promise<string | null> {
	const { data, error } = await supabase
		.from('connector_document_registry')
		.select('id')
		.eq('health_report_id', reportId)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return (data?.id as string | undefined) ?? null
}

export async function clearRegistryErrorForReport(
	reportId: string,
): Promise<void> {
	const registryId = await findRegistryIdForReport(reportId)

	if (!registryId) {
		return
	}

	await updateRegistryRecord(registryId, { errorMessage: null })
}

export async function syncRegistryWithReportOutcome(
	reportId: string,
	outcome:
		{ status: 'completed' } | { status: 'failed'; errorMessage: string | null },
): Promise<void> {
	const registryId = await findRegistryIdForReport(reportId)

	if (!registryId) {
		return
	}

	if (outcome.status === 'completed') {
		await updateRegistryRecord(registryId, {
			importStatus: 'completed',
			registryStatus: 'completed',
			errorMessage: null,
			knowledgeGraphStatus: 'indexed',
		})
		return
	}

	await updateRegistryRecord(registryId, {
		importStatus: 'failed',
		registryStatus: 'failed',
		errorMessage: outcome.errorMessage?.slice(0, 500) ?? null,
	})
}
