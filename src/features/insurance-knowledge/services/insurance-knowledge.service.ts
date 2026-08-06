import {
	buildInsuranceKnowledgeGraph,
	buildInsuranceKnowledgeSourceKey,
} from '@/features/insurance-knowledge/services/insurance-knowledge-builder'
import {
	getCachedInsuranceKnowledge,
	invalidateInsuranceKnowledgeCache,
	setCachedInsuranceKnowledge,
} from '@/features/insurance-knowledge/services/insurance-knowledge-cache'
import type {
	BuildInsuranceKnowledgeInput,
	InsuranceKnowledgeGraph,
} from '@/features/insurance-knowledge/types'

const DEFAULT_PERSON_ID = 'default-person'

export class InsuranceKnowledgeService {
	getGraph(input: BuildInsuranceKnowledgeInput): InsuranceKnowledgeGraph {
		const sourceKey = buildInsuranceKnowledgeSourceKey(input)
		const cached = getCachedInsuranceKnowledge(input.personId, sourceKey)

		if (cached) {
			return cached
		}

		const graph = buildInsuranceKnowledgeGraph(input)
		setCachedInsuranceKnowledge(input.personId, sourceKey, graph)

		return graph
	}

	getGraphForUser(
		userId: string | undefined,
		input: Omit<BuildInsuranceKnowledgeInput, 'personId'>,
	): InsuranceKnowledgeGraph {
		return this.getGraph({
			personId: userId ?? DEFAULT_PERSON_ID,
			...input,
		})
	}

	invalidate(userId?: string): void {
		invalidateInsuranceKnowledgeCache(userId)
	}
}

export const insuranceKnowledgeService = new InsuranceKnowledgeService()
