import { describe, expect, it } from 'vitest'
import { clearAICostLog, getAICostLog } from '@/shared/ai/cost/cost-tracker'
import { clearAIObservabilityLog } from '@/shared/ai/observability/ai-observability'
import {
	clearEvidenceSelectionLog,
	getEvidenceSelectionLog,
} from '@/shared/ai/observability/evidence-observability'
import { AIGateway } from '@/shared/ai/gateway/ai-gateway'
import { createDefaultKnowledgeRegistry } from '@/shared/ai/knowledge/knowledge-bootstrap'
import {
	AIPlatformPipeline,
	createDefaultAIPlatformPipeline,
} from '@/shared/ai/pipeline/ai-platform.pipeline'
import { HealthKnowledgeProvider } from '@/features/health-knowledge/providers/health-knowledge.provider'
import type { HealthKnowledgeRawData } from '@/features/health-knowledge/providers/health-knowledge-data-source'
import type { UploadedHealthReport } from '@/features/health/types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'

function report(): UploadedHealthReport {
	return {
		id: 'report-1',
		user_id: 'user-1',
		family_member_id: 'member-1',
		file_name: 'Thyrocare.pdf',
		storage_path: 'path',
		report_date: '2026-03-09',
		report_type: 'general',
		status: 'completed',
		uploaded_at: '2026-03-09T00:00:00.000Z',
		parsed_data: {
			metrics: [
				{
					canonicalId: 'hba1c',
					displayName: 'HbA1c',
					rawName: 'HbA1c',
					value: '5.8',
					unit: '%',
					status: 'borderline',
					confidence: 0.9,
				},
				{
					canonicalId: 'ldl',
					displayName: 'LDL Cholesterol',
					rawName: 'LDL',
					value: '110',
					unit: 'mg/dL',
					status: 'normal',
					confidence: 0.9,
				},
			],
			metadata: {
				laboratory: 'Thyrocare',
				reportDate: '2026-03-09',
			},
		},
	} as unknown as UploadedHealthReport
}

function rawData(): HealthKnowledgeRawData {
	return {
		uploadedReports: [report()],
		storedMetrics: [
			{
				id: 'metric-1',
				user_id: 'user-1',
				family_member_id: 'member-1',
				report_id: 'report-1',
				workflow_item_id: null,
				canonical_metric_id: 'hba1c',
				display_name: 'HbA1c',
				raw_name: 'HbA1c',
				value: '5.8',
				numeric_value: 5.8,
				unit: '%',
				reference_range_raw: '< 5.7',
				reference_lower: null,
				reference_upper: 5.7,
				status: 'borderline',
				category: 'diabetes',
				report_date: '2026-03-09',
				observed_at: '2026-03-09T00:00:00.000Z',
				confidence: 0.9,
				source: 'parser',
				created_at: '2026-03-09T00:00:00.000Z',
			} as StoredHealthMetric,
		],
		familyMembers: [
			{
				id: 'member-1',
				userId: 'user-1',
				familyId: 'family-1',
				displayName: 'Nivedan',
				relationship: 'self',
				isAccountOwner: true,
				roleId: 'owner',
				dateOfBirth: null,
				gender: null,
				status: 'active',
				avatarUrl: null,
				sortOrder: 0,
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
				aliases: [],
			},
		],
		importRegistry: [],
	}
}

function createPipeline(healthProvider: HealthKnowledgeProvider) {
	return new AIPlatformPipeline({
		gateway: new AIGateway({
			provider: 'mock',
			model: 'mock-model',
			timeoutMs: 5_000,
			maxTokens: 2048,
			temperature: 0.2,
			maxRetries: 1,
		}),
		knowledgeRegistry: createDefaultKnowledgeRegistry(),
		healthKnowledge: healthProvider,
	})
}

describe('AIPlatformPipeline intent + evidence integration', () => {
	it('runs end-to-end with selected evidence for latest report', async () => {
		clearAIObservabilityLog()
		clearAICostLog()
		clearEvidenceSelectionLog()

		const healthProvider = new HealthKnowledgeProvider({
			fetchRawData: async () => rawData(),
		})

		const pipeline = createPipeline(healthProvider)

		const result = await pipeline.summarizeLatestReport({
			userId: 'user-1',
			question: 'Summarize my latest health report',
			familyMemberId: 'member-1',
			accountOwnerMemberId: 'member-1',
			memberName: 'Nivedan',
		})

		expect(result.classifiedIntent.intent).toBe('LATEST_REPORT')
		expect(result.selectedTool).toBe('health.get_latest_report')
		expect(result.selectedEvidence.metadata.excludedItems).toContain(
			'previousReports',
		)
		expect(result.response.summary.length).toBeGreaterThan(0)
		expect(result.observability.classifiedIntent).toBe('LATEST_REPORT')
		expect(result.observability.evidenceCount).toBeGreaterThan(0)
		expect(result.observability.estimatedContextTokens).toBeGreaterThan(0)
		expect(getEvidenceSelectionLog().length).toBe(1)
		expect(getAICostLog().length).toBe(1)
	})

	it('selects cholesterol-only evidence for cholesterol question', async () => {
		const healthProvider = new HealthKnowledgeProvider({
			fetchRawData: async () => rawData(),
		})

		const pipeline = createPipeline(healthProvider)
		const knowledge = await healthProvider.getKnowledge({ userId: 'user-1' })

		const result = await pipeline.run({
			question: 'How is my cholesterol?',
			domain: 'health',
			userId: 'user-1',
			knowledgePayload: {},
			healthKnowledge: knowledge,
		})

		expect(result.selectedTool).toBe('health.search_metrics')
		expect(result.selectedEvidence.metadata.excludedItems).toContain(
			'manualModuleAssembly',
		)
		expect(
			result.selectedEvidence.items.some((item) =>
				item.id.startsWith('graph-'),
			),
		).toBe(true)

		const cholesterolItems = result.selectedEvidence.items.filter(
			(item) =>
				item.type === 'health_metric' &&
				(String(item.data.displayName ?? item.label)
					.toLowerCase()
					.includes('ldl') ||
					String(item.data.displayName ?? item.label)
						.toLowerCase()
						.includes('cholesterol')),
		)

		expect(cholesterolItems.length).toBeGreaterThan(0)
	})

	it('rejects unknown intents', async () => {
		const healthProvider = new HealthKnowledgeProvider({
			fetchRawData: async () => rawData(),
		})

		const pipeline = createDefaultAIPlatformPipeline({
			provider: 'mock',
			model: 'mock-model',
			timeoutMs: 5_000,
			maxTokens: 2048,
			temperature: 0.2,
			maxRetries: 0,
		})

		const knowledge = await healthProvider.getKnowledge({ userId: 'user-1' })

		await expect(
			pipeline.run({
				question: 'What is the weather today?',
				domain: 'health',
				userId: 'user-1',
				knowledgePayload: {},
				healthKnowledge: knowledge,
			}),
		).rejects.toThrow(/not supported/)
	})

	it('handles no report via mock provider', async () => {
		const healthProvider = new HealthKnowledgeProvider({
			fetchRawData: async () => ({
				...rawData(),
				uploadedReports: [],
				storedMetrics: [],
			}),
		})

		const pipeline = createPipeline(healthProvider)

		const result = await pipeline.summarizeLatestReport({
			userId: 'user-1',
			question: 'Summarize my latest health report',
		})

		expect(result.response.overallStatus).toBe('insufficient_data')
	})
})
