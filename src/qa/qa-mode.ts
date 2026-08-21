import {
	QA_STORAGE_PREFIX,
	QA_USER_EMAIL,
	QA_USER_ID,
	QA_USER_NAME,
	type QaScenario,
} from '@/qa/qa-constants'

function readQaEnvFlag(): boolean {
	return import.meta.env.VITE_CHRONICLE_QA_MODE === 'true'
}

/** Throws during module init if QA mode is enabled in a production build. */
export function assertQaModeProductionSafe(): void {
	if (import.meta.env.PROD && readQaEnvFlag()) {
		throw new Error(
			'FATAL: VITE_CHRONICLE_QA_MODE cannot be enabled in production builds.',
		)
	}
}

export function isQaModeEnabled(): boolean {
	return import.meta.env.DEV && readQaEnvFlag()
}

export function getQaScenario(): QaScenario {
	if (!isQaModeEnabled()) {
		return 'FULL'
	}

	if (typeof window === 'undefined') {
		return 'FULL'
	}

	const scenario = window.localStorage.getItem(`${QA_STORAGE_PREFIX}scenario`)

	if (
		scenario === 'EMPTY' ||
		scenario === 'ERROR' ||
		scenario === 'LOADING' ||
		scenario === 'FULL'
	) {
		return scenario
	}

	return 'FULL'
}

export function setQaScenario(scenario: QaScenario): void {
	if (!isQaModeEnabled() || typeof window === 'undefined') {
		return
	}

	window.localStorage.setItem(`${QA_STORAGE_PREFIX}scenario`, scenario)
}

export function getQaUserId(): string {
	return QA_USER_ID
}

export function getQaSessionUser() {
	return {
		id: QA_USER_ID,
		email: QA_USER_EMAIL,
		user_metadata: {
			full_name: QA_USER_NAME,
			name: QA_USER_NAME,
			email: QA_USER_EMAIL,
		},
		app_metadata: {},
		aud: 'authenticated',
		created_at: '2026-01-01T00:00:00.000Z',
	} as const
}

export function isQaStorageKey(key: string): boolean {
	return key.startsWith(QA_STORAGE_PREFIX)
}

export function clearQaStorage(): void {
	if (typeof window === 'undefined') {
		return
	}

	const keys = Object.keys(window.localStorage).filter(isQaStorageKey)

	for (const key of keys) {
		window.localStorage.removeItem(key)
	}
}
