import type { ChronicleIntent } from '@/shared/ai/intent/intent.types'

export type BetaExperienceId =
	| 'summarize-latest-report'
	| 'explain-health-metric'
	| 'abnormal-findings'
	| 'compare-reports'
	| 'recommend-follow-up-tests'
	| 'find-document'
	| 'explain-document'
	| 'monthly-financial-summary'
	| 'trip-assistant'
	| 'family-health-summary'

export type BetaExperienceDomain =
	'health' | 'documents' | 'finance' | 'travel' | 'family'

export type BetaExperienceRoute = 'production-health' | 'grounded'

export interface BetaExperience {
	id: BetaExperienceId
	domain: BetaExperienceDomain
	title: string
	canonicalQuestion: string
	patterns: RegExp[]
	route: BetaExperienceRoute
	healthIntent?: ChronicleIntent
}

export const BETA_EXPERIENCES: BetaExperience[] = [
	{
		id: 'summarize-latest-report',
		domain: 'health',
		title: 'Summarize latest report',
		canonicalQuestion: 'Summarize my latest health report.',
		patterns: [
			/summarize.*latest.*(health )?report/i,
			/latest (health )?report summary/i,
			/what does my latest report show/i,
		],
		route: 'production-health',
		healthIntent: 'LATEST_REPORT',
	},
	{
		id: 'explain-health-metric',
		domain: 'health',
		title: 'Explain health metric',
		canonicalQuestion: 'Explain my HbA1c result.',
		patterns: [
			/explain my (hba1c|ldl|hdl|vitamin d|creatinine|alt|ast|tsh|glucose|cholesterol)/i,
			/what does my (hba1c|ldl|hdl|vitamin d|creatinine|alt|ast|tsh|glucose|cholesterol)/i,
			/what is my (hba1c|ldl|hdl|vitamin d|creatinine|alt|ast|tsh|glucose|cholesterol)/i,
			/explain (this|that|my) metric/i,
		],
		route: 'production-health',
		healthIntent: 'EXPLAIN_METRIC',
	},
	{
		id: 'abnormal-findings',
		domain: 'health',
		title: 'Abnormal findings',
		canonicalQuestion: 'Show my abnormal health findings.',
		patterns: [
			/abnormal (findings|results|metrics|values)/i,
			/out of range/i,
			/what.*(abnormal|concerning|flagged)/i,
			/should i be concerned/i,
			/unresolved findings/i,
		],
		route: 'production-health',
		healthIntent: 'ABNORMAL_RESULTS',
	},
	{
		id: 'compare-reports',
		domain: 'health',
		title: 'Compare reports',
		canonicalQuestion: 'Compare my last two health reports.',
		patterns: [
			/compare.*(report|test|result)/i,
			/what changed since (my )?(last|previous)/i,
			/difference between.*report/i,
			/compare my last two/i,
		],
		route: 'production-health',
		healthIntent: 'COMPARE_REPORTS',
	},
	{
		id: 'recommend-follow-up-tests',
		domain: 'health',
		title: 'Recommend follow-up tests',
		canonicalQuestion: 'What follow-up tests should I consider?',
		patterns: [
			/follow[- ]?up test/i,
			/what (tests|labs) should i (get|take|order|consider)/i,
			/recommend.*(test|lab|screening)/i,
			/what should i discuss with my doctor/i,
		],
		route: 'production-health',
		healthIntent: 'FOLLOW_UP_TESTS',
	},
	{
		id: 'find-document',
		domain: 'documents',
		title: 'Find document',
		canonicalQuestion: 'Where is my passport?',
		patterns: [
			/where is my (passport|pan|aadhaar|aadhar|license|licence|visa|policy|tax return|birth certificate)/i,
			/find my (passport|pan|aadhaar|aadhar|license|licence|visa|policy|tax return|document)/i,
			/locate my (passport|pan|aadhaar|aadhar|license|licence|visa|policy|document)/i,
			/show me my (passport|pan|aadhaar|aadhar|license|licence|visa|policy)/i,
		],
		route: 'grounded',
	},
	{
		id: 'explain-document',
		domain: 'documents',
		title: 'Explain document',
		canonicalQuestion: 'Explain my passport document.',
		patterns: [
			/explain (this|my|the) (passport|policy|visa|document|contract|certificate)/i,
			/what does my (passport|policy|visa|document|contract) (say|mean|cover)/i,
			/summarize (this|my|the) document/i,
			/document summary/i,
		],
		route: 'grounded',
	},
	{
		id: 'monthly-financial-summary',
		domain: 'finance',
		title: 'Monthly financial summary',
		canonicalQuestion: 'Summarize my monthly spending.',
		patterns: [
			/monthly (spending|expenses|financial summary|finance summary)/i,
			/summarize.*(spending|expenses|finances)/i,
			/how much did i spend/i,
			/financial summary/i,
			/bills due this month/i,
		],
		route: 'grounded',
	},
	{
		id: 'trip-assistant',
		domain: 'travel',
		title: 'Trip assistant',
		canonicalQuestion: 'Help me plan my upcoming trip.',
		patterns: [
			/plan my (next )?(trip|vacation|travel)/i,
			/upcoming trip/i,
			/travel assistant/i,
			/when do (my|our) visas expire/i,
			/paris trip|trip to /i,
			/what do i need for (my )?trip/i,
		],
		route: 'grounded',
	},
	{
		id: 'family-health-summary',
		domain: 'family',
		title: 'Family health summary',
		canonicalQuestion: 'Summarize my family health.',
		patterns: [
			/family health summary/i,
			/summarize (our|my) family('s)? health/i,
			/how is (my )?family('s)? health/i,
			/health overview for (my )?family/i,
			/everyone('s)? health/i,
		],
		route: 'grounded',
	},
]

export const BETA_EXPERIENCE_BY_ID = Object.fromEntries(
	BETA_EXPERIENCES.map((experience) => [experience.id, experience]),
) as Record<BetaExperienceId, BetaExperience>

/** Question groups for Ask home — one canonical prompt per beta experience. */
export const BETA_ASK_QUESTION_GROUPS = [
	{
		id: 'health' as const,
		label: 'Health',
		available: true,
		questions: BETA_EXPERIENCES.filter((item) => item.domain === 'health').map(
			(item) => item.canonicalQuestion,
		),
	},
	{
		id: 'documents' as const,
		label: 'Documents',
		available: true,
		questions: BETA_EXPERIENCES.filter(
			(item) => item.domain === 'documents',
		).map((item) => item.canonicalQuestion),
	},
	{
		id: 'finance' as const,
		label: 'Finance',
		available: true,
		questions: BETA_EXPERIENCES.filter((item) => item.domain === 'finance').map(
			(item) => item.canonicalQuestion,
		),
	},
	{
		id: 'travel' as const,
		label: 'Travel',
		available: true,
		questions: BETA_EXPERIENCES.filter((item) => item.domain === 'travel').map(
			(item) => item.canonicalQuestion,
		),
	},
	{
		id: 'family' as const,
		label: 'Family',
		available: true,
		questions: BETA_EXPERIENCES.filter((item) => item.domain === 'family').map(
			(item) => item.canonicalQuestion,
		),
	},
]
