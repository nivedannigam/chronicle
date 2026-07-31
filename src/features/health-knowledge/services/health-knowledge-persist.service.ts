import { supabase } from '@/lib/supabase'
import { buildHealthKnowledgeGraph } from '@/features/health-knowledge/services/health-knowledge-builder'
import { invalidateHealthKnowledgeCache } from '@/features/health-knowledge/services/health-knowledge-cache'
import { backfillHealthMetricsFromReports } from '@/features/health/services/health-metrics-persist.service'
import { fetchHealthMetricsForUser } from '@/features/health/services/health-metrics.service'
import { fetchUploadedHealthReports } from '@/features/health/services/health-upload.service'

export async function persistHealthKnowledgeGraph(
	userId: string,
	familyMemberId: string | null,
) {
	const uploadedReports = await fetchUploadedHealthReports()
	await backfillHealthMetricsFromReports(userId, uploadedReports)
	const storedMetrics = await fetchHealthMetricsForUser(userId, {
		familyMemberId,
	})

	const graph = buildHealthKnowledgeGraph({
		personId: userId,
		uploadedReports,
		storedMetrics,
	})

	const { error } = await supabase.from('health_knowledge_graphs').upsert(
		{
			user_id: userId,
			family_member_id: familyMemberId,
			graph_json: graph,
			version: '1',
			built_at: new Date().toISOString(),
		},
		{ onConflict: 'user_id,family_member_id' },
	)

	if (error) {
		throw new Error(error.message)
	}

	invalidateHealthKnowledgeCache(userId)
}

export async function loadPersistedKnowledgeGraph(
	userId: string,
	familyMemberId: string | null,
) {
	const { data, error } = await supabase
		.from('health_knowledge_graphs')
		.select('graph_json, built_at')
		.eq('user_id', userId)
		.eq('family_member_id', familyMemberId)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return data
		? {
				graph: data.graph_json,
				builtAt: data.built_at as string,
			}
		: null
}
