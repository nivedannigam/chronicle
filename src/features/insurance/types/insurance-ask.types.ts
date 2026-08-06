export type InsuranceAskIntent =
	| 'protection_overview'
	| 'policy_lookup'
	| 'coverage_lookup'
	| 'claim_lookup'
	| 'renewal'
	| 'comparison'
	| 'recommendation'
	| 'financial_summary'
	| 'policy_explanation'
	| 'risk_scenario'
	| 'member_coverage'
	| 'follow_up'
	| 'general'

export interface InsuranceAskScope {
	policyId?: string
	claimId?: string
	categoryId?: string
}

export interface InsuranceAskMemoryContext {
	lastIntent?: InsuranceAskIntent
	lastQuestion?: string
	policyId?: string
	categoryId?: string
	memberName?: string | null
}
