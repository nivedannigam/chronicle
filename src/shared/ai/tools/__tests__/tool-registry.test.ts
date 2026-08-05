import { describe, expect, it } from 'vitest'
import { ToolRegistry } from '@/shared/ai/tools/tool-registry'
import { registerHealthTools } from '@/shared/ai/tools/health/register-health-tools'

describe('ToolRegistry', () => {
	it('registers all health tools', () => {
		const registry = new ToolRegistry()
		registerHealthTools(registry)

		expect(registry.list('health')).toHaveLength(12)
		expect(registry.has('health.get_abnormal_metrics')).toBe(true)
	})

	it('returns tools for intent', () => {
		const registry = new ToolRegistry()
		registerHealthTools(registry)

		const tools = registry.getForIntent('ABNORMAL_RESULTS', 'health')
		expect(
			tools.some((tool) => tool.name === 'health.get_abnormal_metrics'),
		).toBe(true)
	})

	it('throws when registering duplicate tool', () => {
		const registry = new ToolRegistry()
		registerHealthTools(registry)

		expect(() => registry.register(registry.list('health')[0]!)).toThrow(
			/already registered/,
		)
	})
})
