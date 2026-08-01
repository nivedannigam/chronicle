import { describe, expect, it, beforeEach } from 'vitest'
import { HealthKnowledgeProvider } from '@/features/health-knowledge/providers/health-knowledge.provider'
import type { HealthKnowledgeRawData } from '@/features/health-knowledge/providers/health-knowledge-data-source'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'
import { KnowledgeGraphService } from '@/shared/knowledge-graph/services/knowledge-graph.service'
import { healthGraphAdapter } from '@/shared/knowledge-graph/adapters/health-graph.adapter'
import { clearGraphObservabilityLog } from '@/shared/knowledge-graph/observability/graph-observability'
import type { ChronicleEntity } from '@/shared/knowledge-graph/types/entity.types'

const USER_ID = 'user-kg-1'
const MEMBER_ID = 'member-kg'

function buildKnowledge() {
	const provider = new HealthKnowledgeProvider({
		fetchRawData: async () => rawData(),
	})

	return provider.buildFromRawData(rawData(), {
		userId: USER_ID,
		familyMemberId: MEMBER_ID,
		accountOwnerMemberId: MEMBER_ID,
	})
}

function member(): FamilyMemberWithAliases {
	return {
		id: MEMBER_ID,
		userId: USER_ID,
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
	}
}

function report(): UploadedHealthReport {
	return {
		id: 'report-1',
		user_id: USER_ID,
		family_member_id: MEMBER_ID,
		file_name: 'Thyrocare.pdf',
		storage_path: 'path',
		report_date: '2026-03-09',
		report_type: 'general',
		status: 'completed',
		uploaded_at: '2026-03-09T00:00:00.000Z',
		parsed_data: {
			metrics: [
				{
					canonicalId: 'ldl',
					displayName: 'LDL Cholesterol',
					rawName: 'LDL',
					value: '110',
					unit: 'mg/dL',
					status: 'normal',
				},
				{
					canonicalId: 'hba1c',
					displayName: 'HbA1c',
					rawName: 'HbA1c',
					value: '5.8',
					unit: '%',
					status: 'borderline',
				},
			],
			metadata: { laboratory: 'Thyrocare', reportDate: '2026-03-09' },
		},
	} as unknown as UploadedHealthReport
}

function rawData(): HealthKnowledgeRawData {
	return {
		uploadedReports: [report()],
		storedMetrics: [
			{
				id: 'metric-ldl',
				user_id: USER_ID,
				family_member_id: MEMBER_ID,
				report_id: 'report-1',
				workflow_item_id: null,
				canonical_metric_id: 'ldl',
				display_name: 'LDL Cholesterol',
				raw_name: 'LDL',
				value: '110',
				numeric_value: 110,
				unit: 'mg/dL',
				reference_range_raw: '< 100',
				reference_lower: null,
				reference_upper: 100,
				status: 'normal',
				category: 'heart',
				report_date: '2026-03-09',
				observed_at: '2026-03-09T00:00:00.000Z',
				confidence: 0.9,
				source: 'parser',
				created_at: '2026-03-09T00:00:00.000Z',
			} as StoredHealthMetric,
		],
		familyMembers: [member()],
		importRegistry: [],
	}
}

describe('KnowledgeGraphService', () => {
	let service: KnowledgeGraphService

	beforeEach(() => {
		clearGraphObservabilityLog()
		service = new KnowledgeGraphService()
		service.registerAdapter(healthGraphAdapter)
	})

	it('creates entities and relationships from health knowledge', () => {
		service.loadHealthKnowledge(buildKnowledge())
		const snapshot = service.snapshot()

		expect(snapshot.entityCount).toBeGreaterThan(0)
		expect(snapshot.relationshipCount).toBeGreaterThan(0)
		expect(snapshot.domains).toContain('health')
	})

	it('finds entities by type', () => {
		service.loadHealthKnowledge(buildKnowledge())

		const metrics = service.findEntity({ type: 'HealthMetric' })
		expect(metrics.length).toBeGreaterThan(0)
		expect(metrics.every((entity) => entity.type === 'HealthMetric')).toBe(true)
	})

	it('finds related metrics for a report', () => {
		service.loadHealthKnowledge(buildKnowledge())
		const reports = service.findEntity({ type: 'HealthReport' })
		const reportEntity = reports[0]!

		const related = service.findRelated({
			entityId: reportEntity.id,
			relationshipTypes: ['contains'],
			direction: 'outgoing',
		})

		expect(related.length).toBeGreaterThan(0)
		expect(related.every((item) => item.entity.type === 'HealthMetric')).toBe(
			true,
		)
	})

	it('searches graph by metric name', () => {
		service.loadHealthKnowledge(buildKnowledge())
		const hits = service.search({ text: 'HbA1c', limit: 5 })

		expect(hits.some((hit) => hit.entity.label.includes('HbA1c'))).toBe(true)
	})

	it('expands graph from seed entities', () => {
		service.loadHealthKnowledge(buildKnowledge())
		const report = service.findEntity({ type: 'HealthReport' })[0]!

		const expanded = service.expand({ entityIds: [report.id], depth: 2 })

		expect(expanded.entities.length).toBeGreaterThan(1)
		expect(expanded.relationships.length).toBeGreaterThan(0)
	})

	it('traces path between report and metric', () => {
		service.loadHealthKnowledge(buildKnowledge())
		const report = service.findEntity({ type: 'HealthReport' })[0]!
		const metric = service.findEntity({ type: 'HealthMetric' })[0]!

		const path = service.trace({
			fromEntityId: report.id,
			toEntityId: metric.id,
		})

		expect(path).not.toBeNull()
		expect(path!.entityIds).toContain(report.id)
		expect(path!.entityIds).toContain(metric.id)
	})

	it('builds AI context for abnormal findings question', () => {
		service.loadHealthKnowledge(buildKnowledge())

		const context = service.buildContext({
			question: 'What were my abnormal findings?',
			intent: 'ABNORMAL_RESULTS',
			memberId: MEMBER_ID,
		})

		expect(context.entities.length).toBeGreaterThan(0)
		expect(context.linkedEntityIds.length).toBeGreaterThan(0)
		expect(context.buildTimeMs).toBeGreaterThan(0)
	})

	it('handles missing links gracefully', () => {
		service.upsertEntity({
			id: 'trip:japan',
			type: 'Trip',
			label: 'Japan Trip',
			domain: 'travel',
			sourceProvider: 'test',
			metadata: { destination: 'Japan' },
		})

		const context = service.buildContext({
			question: 'What documents do I need for my Japan trip?',
			intent: 'UNKNOWN',
			seedEntityIds: ['trip:japan'],
		})

		expect(context.entities.some((entity) => entity.id === 'trip:japan')).toBe(
			true,
		)
	})

	it('avoids infinite loops on circular references', () => {
		const a: ChronicleEntity = {
			id: 'entity:a',
			type: 'Document',
			label: 'Doc A',
			domain: 'documents',
			sourceProvider: 'test',
			metadata: {},
		}
		const b: ChronicleEntity = {
			id: 'entity:b',
			type: 'Document',
			label: 'Doc B',
			domain: 'documents',
			sourceProvider: 'test',
			metadata: {},
		}

		service.upsertEntity(a)
		service.upsertEntity(b)
		service.upsertRelationship({
			id: 'rel:ab',
			type: 'related_to',
			fromEntityId: a.id,
			toEntityId: b.id,
			label: 'related',
			domain: 'documents',
			sourceProvider: 'test',
		})
		service.upsertRelationship({
			id: 'rel:ba',
			type: 'related_to',
			fromEntityId: b.id,
			toEntityId: a.id,
			label: 'related',
			domain: 'documents',
			sourceProvider: 'test',
		})

		const expanded = service.expand({
			entityIds: [a.id],
			depth: 5,
			maxEntities: 10,
		})

		expect(expanded.entities.length).toBeLessThanOrEqual(10)
	})
})
