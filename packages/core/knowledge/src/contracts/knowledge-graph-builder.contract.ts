import type { KnowledgeDomain } from '../types/knowledge-domain.types.ts'

export interface KnowledgeGraphBuilder<TInput, TGraph> {
	readonly domain: KnowledgeDomain
	build(input: TInput): TGraph
}
