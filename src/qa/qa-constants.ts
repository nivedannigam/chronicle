/** Stable synthetic QA identity — never a real user account. */
export const QA_USER_ID = '00000000-0000-4000-8000-000000000001'
export const QA_USER_EMAIL = 'qa@chronicle.local'
export const QA_USER_NAME = 'Nivedan QA'

export const QA_FAMILY_ID = '00000000-0000-4000-8000-0000000000f1'

export const QA_MEMBER_IDS = {
	nivedan: '00000000-0000-4000-8000-000000000101',
	wife: '00000000-0000-4000-8000-000000000102',
	daughter: '00000000-0000-4000-8000-000000000103',
	parent: '00000000-0000-4000-8000-000000000104',
} as const

export const QA_STORAGE_PREFIX = 'chronicle:qa:v1:'

export type QaScenario = 'FULL' | 'EMPTY' | 'ERROR' | 'LOADING'
