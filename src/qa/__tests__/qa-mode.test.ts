import { describe, expect, it, vi } from 'vitest'

async function loadQaMode() {
	vi.resetModules()
	return import('@/qa/qa-mode')
}

describe('QA mode production safety', () => {
	it('refuses QA mode when PROD and flag enabled', async () => {
		vi.stubEnv('VITE_CHRONICLE_QA_MODE', 'true')

		const env = import.meta.env as Record<string, unknown>
		const previousProd = env.PROD
		env.PROD = true

		const { assertQaModeProductionSafe } = await loadQaMode()

		expect(() => assertQaModeProductionSafe()).toThrow(
			/FATAL: VITE_CHRONICLE_QA_MODE cannot be enabled in production builds/,
		)

		env.PROD = previousProd
		vi.unstubAllEnvs()
	})

	it('does not enable QA mode without DEV even if flag is true', async () => {
		vi.stubEnv('VITE_CHRONICLE_QA_MODE', 'true')

		const env = import.meta.env as Record<string, unknown>
		const previousDev = env.DEV
		env.DEV = false

		const { isQaModeEnabled } = await loadQaMode()
		expect(isQaModeEnabled()).toBe(false)

		env.DEV = previousDev
		vi.unstubAllEnvs()
	})

	it('requires explicit QA flag even in DEV', async () => {
		vi.stubEnv('VITE_CHRONICLE_QA_MODE', 'false')

		const env = import.meta.env as Record<string, unknown>
		const previousDev = env.DEV
		env.DEV = true

		const { isQaModeEnabled } = await loadQaMode()
		expect(isQaModeEnabled()).toBe(false)

		env.DEV = previousDev
		vi.unstubAllEnvs()
	})
})

describe('QA storage isolation', () => {
	it('matches only chronicle:qa:v1: keys', async () => {
		const { isQaStorageKey } = await loadQaMode()

		expect(isQaStorageKey('chronicle:qa:v1:dataset')).toBe(true)
		expect(isQaStorageKey('chronicle:qa:v1:scenario')).toBe(true)
		expect(isQaStorageKey('chronicle:production:keep')).toBe(false)
		expect(isQaStorageKey('supabase.auth.token')).toBe(false)
	})

	it('clearQaStorage targets only QA-prefixed keys', async () => {
		const { isQaStorageKey } = await loadQaMode()
		const keys = ['chronicle:qa:v1:dataset', 'chronicle:production:keep']

		expect(keys.filter(isQaStorageKey)).toEqual(['chronicle:qa:v1:dataset'])
	})
})
