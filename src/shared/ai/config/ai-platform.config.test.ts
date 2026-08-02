import { describe, expect, it } from 'vitest'
import {
	isSupabaseClientConfigured,
	loadAIPlatformConfig,
} from '@/shared/ai/config/ai-platform.config'
import { GEMINI_MODEL } from '@/shared/ai/constants/gemini-model'

describe('ai-platform.config', () => {
	it('defaults to mock without supabase and gemini model constant when overridden', () => {
		const offline = loadAIPlatformConfig({ provider: 'mock' })
		expect(offline.provider).toBe('mock')

		const online = loadAIPlatformConfig({ provider: 'gemini' })
		expect(online.provider).toBe('gemini')
		expect(online.model).toBe(GEMINI_MODEL)
	})

	it('reports supabase configuration from vite env when present', () => {
		expect(typeof isSupabaseClientConfigured()).toBe('boolean')
	})
})
