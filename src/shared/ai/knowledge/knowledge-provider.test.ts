import { describe, expect, it } from 'vitest'
import { HealthKnowledgePlatformAdapter } from '@/shared/ai/knowledge/health-knowledge.provider'
import { KnowledgeProviderRegistry } from '@/shared/ai/knowledge/knowledge-provider.registry'

describe('KnowledgeProvider', () => {
	it('normalizes health payloads without database access', async () => {
		const provider = new HealthKnowledgePlatformAdapter()

		const knowledge = await provider.retrieve({
			domain: 'health',
			intent: 'summarize_report',
			question: 'Summarize my report',
			payload: {
				reports: [
					{
						id: 'r1',
						title: 'Thyrocare',
						date: '2026-03-09',
						lab: 'Thyrocare',
						metrics: [
							{
								displayName: 'LDL',
								value: '110',
								unit: 'mg/dL',
								status: 'normal',
							},
						],
					},
				],
				coverageNotes: ['1 of 11 files imported'],
			},
		})

		expect(knowledge.dataAvailable).toBe(true)
		expect(knowledge.metrics).toHaveLength(1)
		expect(knowledge.evidence.length).toBeGreaterThan(0)
		expect(knowledge.coverageNotes[0]).toContain('11 files')
	})

	it('returns empty knowledge for unknown domains', async () => {
		const registry = new KnowledgeProviderRegistry()

		const knowledge = await registry.retrieve({
			domain: 'finance',
			intent: 'general',
			question: 'What is my spending?',
			payload: {},
		})

		expect(knowledge.dataAvailable).toBe(false)
		expect(knowledge.coverageNotes[0]).toContain('finance')
	})
})
