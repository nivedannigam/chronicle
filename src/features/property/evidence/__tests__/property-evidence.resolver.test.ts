import { describe, expect, it } from 'vitest'
import {
	isPropertyCoverageQuestion,
	isPropertyEntityLookupQuestion,
	resolvePropertyEvidence,
} from '@/features/property/evidence/property-evidence.resolver'
import { planAndResolvePropertyEvidence } from '@/shared/ai/evidence-planning/plan-property-evidence'
import type { PropertyKnowledge } from '@/features/property-knowledge/types/property-knowledge.types'

const sampleKnowledge: PropertyKnowledge = {
	userId: 'user-1',
	setupStatus: 'ready',
	hasFolderAssigned: true,
	hasProperties: true,
	hasDocuments: true,
	isOrganizing: false,
	properties: [
		{
			id: 'property-pune',
			slug: 'pune-home',
			displayName: 'Pune Home',
			propertyType: 'apartment',
			propertyTypeLabel: 'Apartment',
			address: null,
			city: 'Pune',
			documentCount: 3,
			purchaseDate: '2021-03-12',
			possessionDate: null,
			registrationDate: null,
			societyName: null,
			status: 'active',
			ownership: 'joint',
			ownerNames: ['Nivedita', 'Rahul'],
			ownerMemberIds: [],
			facts: [
				{
					key: 'purchaseDate',
					label: 'Purchase date',
					displayValue: '12 March 2021',
					asOfDate: '2021-03-12',
					sourceDocumentId: 'doc-1',
					confidence: 'high',
				},
			],
			references: [],
			sourceDocumentIds: ['doc-1'],
			resolutionState: 'resolved',
		},
	],
	documents: [],
	attention: [],
	timeline: [],
	summary: {
		headline: '2 properties',
		subline: 'Pune Home · Pune · 3 documents',
		propertyCount: 1,
		documentCount: 3,
	},
	limitations: [],
}

describe('property evidence resolver', () => {
	it('detects purchase date questions', () => {
		const resolved = planAndResolvePropertyEvidence({
			question: 'When did I buy my Pune home?',
			knowledge: sampleKnowledge,
		})

		expect(resolved.questionType).toBe('FACT_LOOKUP')
		expect(resolved.evidenceBundle.summary.lines.join(' ')).toContain('2021')
	})

	it('returns honest missing-data messaging', () => {
		const resolved = resolvePropertyEvidence({
			knowledge: { ...sampleKnowledge, properties: [] },
			request: {
				question: 'When did I buy my Pune home?',
				questionType: 'FACT_LOOKUP',
				domain: 'property',
				subject: {},
			},
		})

		expect(resolved.summary.limitations[0]).toContain(
			"don't have a reliable property record",
		)
	})

	it('classifies coverage and inventory phrasing', () => {
		expect(
			isPropertyCoverageQuestion('What documents do I have for my home?'),
		).toBe(true)
		expect(isPropertyEntityLookupQuestion('What properties do I have?')).toBe(
			true,
		)
	})
})
