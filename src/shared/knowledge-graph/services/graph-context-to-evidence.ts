import { estimateEvidenceTokens } from '@/shared/ai/evidence/token-estimator'
import type {
	EvidenceItem,
	SelectedEvidence,
} from '@/shared/ai/evidence/evidence.types'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type { GraphContext } from '@/shared/knowledge-graph/types/graph.types'
import type { ChronicleEntity } from '@/shared/knowledge-graph/types/entity.types'

function entityToEvidenceItem(entity: ChronicleEntity): EvidenceItem {
	const typeMap: Partial<Record<ChronicleEntity['type'], string>> = {
		HealthReport: 'health_report',
		HealthMetric: 'health_metric',
		HealthCategory: 'health_category',
		Recommendation: 'recommendation',
		TimelineEvent: 'timeline_event',
		FamilyMember: 'family_member',
		Person: 'person',
		Trip: 'trip',
		Visa: 'visa',
		Passport: 'passport',
		Document: 'document',
		Task: 'task',
	}

	return {
		id: `graph-${entity.id}`,
		type: typeMap[entity.type] ?? entity.type.toLowerCase(),
		label: entity.label,
		data: {
			graphEntityId: entity.id,
			entityType: entity.type,
			domain: entity.domain,
			...entity.metadata,
		},
	}
}

export function graphContextToEvidence(input: {
	context: GraphContext
	classifiedIntent: ClassifiedIntent
	question: string
	toolEvidenceItems?: EvidenceItem[]
}): SelectedEvidence {
	const graphItems = input.context.entities.map(entityToEvidenceItem)
	const merged = new Map<string, EvidenceItem>()

	for (const item of graphItems) {
		merged.set(item.id, item)
	}

	for (const item of input.toolEvidenceItems ?? []) {
		if (!merged.has(item.id)) {
			merged.set(item.id, item)
		}
	}

	const items = [...merged.values()]
	const payload = {
		source: 'knowledge-graph',
		intent: input.classifiedIntent.intent,
		seedEntities: input.context.seedEntities,
		relationshipCount: input.context.relationships.length,
		evidence: items,
	}

	return {
		domain: 'health',
		intent: input.classifiedIntent.intent,
		question: input.question,
		items,
		metadata: {
			evidenceCount: items.length,
			excludedItems: [
				'rawDatabaseRows',
				'fullKnowledgeGraphDump',
				'unlinkedEntities',
			],
			estimatedTokens: estimateEvidenceTokens({
				payload,
				question: input.question,
			}),
			contextSizeChars: JSON.stringify(payload).length,
			selectedKeys: items.map((item) => item.id),
		},
	}
}

export function mergeGraphAndToolEvidence(input: {
	graphContext: GraphContext
	classifiedIntent: ClassifiedIntent
	question: string
	toolItems: EvidenceItem[]
	excludedFromTool: string[]
}): SelectedEvidence {
	const evidence = graphContextToEvidence({
		context: input.graphContext,
		classifiedIntent: input.classifiedIntent,
		question: input.question,
		toolEvidenceItems: input.toolItems,
	})

	return {
		...evidence,
		metadata: {
			...evidence.metadata,
			excludedItems: [
				...new Set([
					...evidence.metadata.excludedItems,
					...input.excludedFromTool,
					'manualModuleAssembly',
				]),
			],
		},
	}
}
