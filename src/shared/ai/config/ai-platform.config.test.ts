import { describe, expect, it } from 'vitest'
import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'

describe('ai-platform.config', () => {
	it('defaults to mock without proxy and gemini when proxy is set', () => {
		const offline = loadAIPlatformConfig({ proxyUrl: '' })
		expect(offline.provider).toBe('mock')

		const online = loadAIPlatformConfig({
			proxyUrl: 'https://example.com/ask-ai',
		})
		expect(online.provider).toBe('gemini')
		expect(online.model).toContain('gemini')
	})
})
