import { describe, expect, it } from 'vitest'
import type { HealthToolPayload } from '@/shared/ai/tools/tool.types'
import { ToolExecutor } from '@/shared/ai/tools/tool-executor'
import { ToolRegistry } from '@/shared/ai/tools/tool-registry'
import type { ChronicleTool } from '@/shared/ai/tools/tool.types'
import { registerHealthTools } from '@/shared/ai/tools/health/register-health-tools'
import {
	buildKnowledge,
	buildToolContext,
	member,
} from '@/shared/ai/tools/health/__tests__/health-tool.fixtures'
import {
	clearToolExecutionLog,
	getToolExecutionLog,
} from '@/shared/ai/tools/tool-observability'

describe('ToolExecutor', () => {
	it('executes a registered health tool', async () => {
		clearToolExecutionLog()
		const registry = new ToolRegistry()
		registerHealthTools(registry)
		const executor = new ToolExecutor({ registry })
		const knowledge = buildKnowledge()

		const result = await executor.execute<HealthToolPayload>(
			'health.get_abnormal_metrics',
			buildToolContext(knowledge, {
				question: 'What were my abnormal findings?',
				intent: 'ABNORMAL_RESULTS',
			}),
		)

		expect(result.success).toBe(true)
		expect(result.tool).toBe('health.get_abnormal_metrics')
		expect(result.data.items.length).toBeGreaterThan(0)
		expect(getToolExecutionLog().length).toBe(1)
	})

	it('throws when tool is not found', async () => {
		const executor = new ToolExecutor({ registry: new ToolRegistry() })

		await expect(
			executor.execute(
				'health.missing_tool',
				buildToolContext(buildKnowledge()),
			),
		).rejects.toMatchObject({ code: 'not_found' })
	})

	it('denies permission for cross-member access', async () => {
		const registry = new ToolRegistry()
		registerHealthTools(registry)
		const executor = new ToolExecutor({ registry })
		const knowledge = buildKnowledge({
			familyMembers: [
				{
					...member(),
					isAccountOwner: false,
				},
			],
		})

		const context = buildToolContext(knowledge, {
			familyMemberId: 'other-member',
			intent: 'ABNORMAL_RESULTS',
		})

		await expect(
			executor.execute('health.get_abnormal_metrics', context),
		).rejects.toMatchObject({ code: 'permission_denied' })
	})

	it('times out slow tools', async () => {
		const registry = new ToolRegistry()
		const slowTool: ChronicleTool = {
			name: 'health.slow_tool',
			domain: 'health',
			description: 'Slow tool for timeout testing',
			inputSchema: { type: 'object', properties: {} },
			outputSchema: { type: 'object', properties: {} },
			timeoutMs: 50,
			permissions: ['read_only', 'admin'],
			estimatedCostUsd: 0,
			supportedIntents: ['UNKNOWN'],
			async execute() {
				await new Promise((resolve) => setTimeout(resolve, 200))
				return {
					success: true,
					tool: 'health.slow_tool',
					domain: 'health',
					data: { items: [], excluded: [], confidence: 0 },
					confidence: 0,
					executionTimeMs: 200,
					inputSizeChars: 0,
					outputSizeChars: 0,
					retryCount: 0,
				}
			},
		}

		registry.register(slowTool)
		const executor = new ToolExecutor({ registry })

		const context = buildToolContext(buildKnowledge(), { intent: 'UNKNOWN' })
		context.role = 'admin'

		await expect(
			executor.execute('health.slow_tool', context),
		).rejects.toMatchObject({ code: 'timeout' })
	})
})
