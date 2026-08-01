import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { GraphStore } from '@/shared/knowledge-graph/store/graph-store'
import type { ChronicleEntity } from '@/shared/knowledge-graph/types/entity.types'

function entityId(prefix: string, id: string): string {
	return `${prefix}:${id}`
}

function relationshipId(type: string, from: string, to: string): string {
	return `${type}:${from}->${to}`
}

export function ingestHealthKnowledge(
	store: GraphStore,
	knowledge: HealthKnowledge,
): { entityCount: number; relationshipCount: number } {
	const memberEntityId = entityId(
		'family-member',
		knowledge.familyMember.id ?? knowledge.patient.userId,
	)

	const personEntity: ChronicleEntity = {
		id: entityId('person', knowledge.patient.userId),
		type: 'Person',
		label: knowledge.familyMember.displayName,
		domain: 'family',
		sourceProvider: 'health-knowledge',
		memberId: knowledge.familyMember.id,
		metadata: {
			userId: knowledge.patient.userId,
		},
	}

	const memberEntity: ChronicleEntity = {
		id: memberEntityId,
		type: 'FamilyMember',
		label: knowledge.familyMember.displayName,
		domain: 'family',
		sourceProvider: 'health-knowledge',
		memberId: knowledge.familyMember.id,
		metadata: {
			relationship: knowledge.familyMember.relationship,
			isAccountOwner: knowledge.familyMember.isAccountOwner,
		},
	}

	store.upsertEntity(personEntity)
	store.upsertEntity(memberEntity)

	store.upsertRelationship({
		id: relationshipId('member_of', memberEntity.id, personEntity.id),
		type: 'member_of',
		fromEntityId: memberEntity.id,
		toEntityId: personEntity.id,
		label: 'member of',
		domain: 'family',
		sourceProvider: 'health-knowledge',
	})

	const categoryIds = new Set<string>()

	for (const metric of knowledge.metrics) {
		const categoryId = entityId('health-category', metric.categoryId)
		categoryIds.add(categoryId)

		if (!store.getEntity(categoryId)) {
			store.upsertEntity({
				id: categoryId,
				type: 'HealthCategory',
				label: metric.categoryId,
				domain: 'health',
				sourceProvider: 'health-knowledge',
				memberId: knowledge.familyMember.id,
				metadata: { categoryId: metric.categoryId },
			})
		}
	}

	for (const report of [
		...(knowledge.latestReport ? [knowledge.latestReport] : []),
		...knowledge.previousReports,
	]) {
		const reportEntityId = entityId('health-report', report.id)

		store.upsertEntity({
			id: reportEntityId,
			type: 'HealthReport',
			label: report.title,
			domain: 'health',
			sourceProvider: 'health-knowledge',
			memberId: knowledge.familyMember.id,
			metadata: {
				reportId: report.id,
				date: report.date,
				lab: report.lab,
				status: report.status,
				metricCount: report.metricCount,
			},
		})

		store.upsertRelationship({
			id: relationshipId('belongs_to', reportEntityId, memberEntity.id),
			type: 'belongs_to',
			fromEntityId: reportEntityId,
			toEntityId: memberEntity.id,
			label: 'belongs to',
			domain: 'health',
			sourceProvider: 'health-knowledge',
		})
	}

	for (const metric of knowledge.metrics) {
		const metricEntityId = entityId('health-metric', metric.id)
		const reportEntityId = entityId('health-report', metric.reportId)
		const categoryId = entityId('health-category', metric.categoryId)

		store.upsertEntity({
			id: metricEntityId,
			type: 'HealthMetric',
			label: metric.displayName,
			domain: 'health',
			sourceProvider: 'health-knowledge',
			memberId: knowledge.familyMember.id,
			metadata: {
				canonicalId: metric.canonicalId,
				displayName: metric.displayName,
				value: metric.value,
				unit: metric.unit,
				status: metric.status,
				referenceRange: metric.referenceRange,
				reportId: metric.reportId,
				observedAt: metric.observedAt,
				clinicalScore: metric.clinicalScore,
			},
		})

		store.upsertRelationship({
			id: relationshipId('contains', reportEntityId, metricEntityId),
			type: 'contains',
			fromEntityId: reportEntityId,
			toEntityId: metricEntityId,
			label: 'contains',
			domain: 'health',
			sourceProvider: 'health-knowledge',
		})

		store.upsertRelationship({
			id: relationshipId('belongs_to', metricEntityId, categoryId),
			type: 'belongs_to',
			fromEntityId: metricEntityId,
			toEntityId: categoryId,
			label: 'belongs to category',
			domain: 'health',
			sourceProvider: 'health-knowledge',
		})
	}

	for (const rec of knowledge.recommendations) {
		const recEntityId = entityId('recommendation', rec.id)

		store.upsertEntity({
			id: recEntityId,
			type: 'Recommendation',
			label: rec.text.slice(0, 80),
			domain: 'health',
			sourceProvider: 'health-knowledge',
			memberId: knowledge.familyMember.id,
			metadata: {
				text: rec.text,
				priority: rec.priority,
			},
		})

		if (knowledge.latestReport) {
			store.upsertRelationship({
				id: relationshipId(
					'related_to',
					recEntityId,
					entityId('health-report', knowledge.latestReport.id),
				),
				type: 'related_to',
				fromEntityId: recEntityId,
				toEntityId: entityId('health-report', knowledge.latestReport.id),
				label: 'related to report',
				domain: 'health',
				sourceProvider: 'health-knowledge',
			})
		}
	}

	for (const event of knowledge.timeline.slice(0, 20)) {
		const eventEntityId = entityId('timeline-event', event.id)

		store.upsertEntity({
			id: eventEntityId,
			type: 'TimelineEvent',
			label: event.title,
			domain: 'health',
			sourceProvider: 'health-knowledge',
			memberId: knowledge.familyMember.id,
			metadata: {
				type: event.type,
				description: event.description,
				date: event.date,
				reportId: event.reportId,
				metricId: event.metricId,
			},
		})

		if (event.reportId) {
			store.upsertRelationship({
				id: relationshipId(
					'related_to',
					eventEntityId,
					entityId('health-report', event.reportId),
				),
				type: 'related_to',
				fromEntityId: eventEntityId,
				toEntityId: entityId('health-report', event.reportId),
				label: 'related to report',
				domain: 'health',
				sourceProvider: 'health-knowledge',
			})
		}
	}

	const snapshot = store.snapshot()
	return {
		entityCount: snapshot.entityCount,
		relationshipCount: snapshot.relationshipCount,
	}
}

export interface GraphDomainAdapter<TInput = unknown> {
	readonly domain: ChronicleEntity['domain']
	ingest(
		store: GraphStore,
		input: TInput,
	): { entityCount: number; relationshipCount: number }
}

export const healthGraphAdapter: GraphDomainAdapter<HealthKnowledge> = {
	domain: 'health',
	ingest: ingestHealthKnowledge,
}
