import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceKnowledgeTimelineEvent } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import { insuranceKnowledgeProvider } from '@/features/insurance-knowledge'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import type {
	ChronicleTimelineProvider,
	TimelineProviderQuery,
} from '@/features/timeline/contracts/timeline-provider.contract'
import { registerTimelineProvider } from '@/features/timeline/registry/timeline-registry'
import type {
	ChronicleTimelineEvent,
	TimelineImportance,
} from '@/features/timeline/types/timeline.types'

const PROVIDER_ID = 'insurance'

interface InsuranceTimelineSource {
	knowledge?: InsuranceKnowledge
	rawData?: InsuranceKnowledgeRawData
	userId?: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
}

function getInsuranceKnowledge(
	query: TimelineProviderQuery,
): InsuranceKnowledge | null {
	const source = query.sources.insurance as InsuranceTimelineSource | undefined

	if (source?.knowledge) {
		return source.knowledge
	}

	if (source?.rawData && source.userId) {
		return insuranceKnowledgeProvider.buildFromRawData(source.rawData, {
			userId: source.userId,
			familyMemberId: source.familyMemberId ?? null,
			accountOwnerMemberId: source.accountOwnerMemberId ?? null,
		})
	}

	return null
}

function mapEventType(
	type: InsuranceKnowledgeTimelineEvent['type'],
): ChronicleTimelineEvent['eventType'] {
	switch (type) {
		case 'policy_purchased':
			return 'insurance_purchased'
		case 'policy_renewed':
			return 'document_renewed'
		case 'policy_expired':
		case 'policy_closed':
			return 'document_expiry'
		case 'claim_filed':
		case 'claim_settled':
			return 'custom'
		default:
			return 'custom'
	}
}

function mapImportance(
	type: InsuranceKnowledgeTimelineEvent['type'],
): TimelineImportance {
	switch (type) {
		case 'policy_expired':
		case 'claim_filed':
			return 'high'
		case 'policy_renewed':
		case 'premium_paid':
			return 'medium'
		default:
			return 'low'
	}
}

function toChronicleEvent(
	event: InsuranceKnowledgeTimelineEvent,
	knowledge: InsuranceKnowledge,
): ChronicleTimelineEvent {
	return {
		id: `insurance-${event.id}`,
		timestamp: event.date,
		eventType: mapEventType(event.type),
		title: event.title,
		summary: event.description,
		familyMemberId: knowledge.familyMember.id,
		sourceModule: 'insurance',
		relatedAssets: [
			...(event.policyId
				? [
						{
							type: 'document' as const,
							id: event.policyId,
							label: event.title,
						},
					]
				: []),
			...(event.claimId
				? [
						{
							type: 'document' as const,
							id: event.claimId,
							label: 'Claim',
						},
					]
				: []),
		],
		tags: ['insurance', event.type],
		importance: mapImportance(event.type),
		references: event.evidenceIds.map((evidenceId) => ({
			type: 'evidence',
			id: evidenceId,
			label: evidenceId,
		})),
		metadata: {
			policyId: event.policyId ?? '',
			claimId: event.claimId ?? '',
			documentId: event.documentId ?? '',
		},
	}
}

export class InsuranceTimelineProvider implements ChronicleTimelineProvider {
	readonly id = PROVIDER_ID
	readonly module = 'insurance'
	readonly label = 'Insurance'
	readonly priority = 15

	supports(query: TimelineProviderQuery): boolean {
		const knowledge = getInsuranceKnowledge(query)
		return Boolean(knowledge && knowledge.timeline.length > 0)
	}

	getEvents(query: TimelineProviderQuery): ChronicleTimelineEvent[] {
		const knowledge = getInsuranceKnowledge(query)

		if (!knowledge) {
			return []
		}

		return knowledge.timeline.map((event) => toChronicleEvent(event, knowledge))
	}
}

export const insuranceTimelineProvider = new InsuranceTimelineProvider()

registerTimelineProvider(insuranceTimelineProvider)
