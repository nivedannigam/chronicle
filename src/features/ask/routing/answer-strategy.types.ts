export type AnswerStrategy = 'FACT_LOOKUP' | 'NARRATIVE' | 'META'

export interface AnswerStrategyResult {
	strategy: AnswerStrategy
	reason: string
	/** Legacy intent from regex detector — used for retrieval scoping. */
	legacyIntent: string
}
