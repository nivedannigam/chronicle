import { describe, expect, it } from 'vitest'
import {
	buildFinanceExtractionPayloadFromAi,
	deriveFinanceRecordsFromDocuments,
} from '@/features/finance-knowledge/services/derive-finance-records-from-documents.service'
import {
	buildFinanceKnowledge,
	buildFinanceHomeViewModel,
} from '@/features/finance-knowledge/services/finance-knowledge.builder'
import {
	applyFinanceTimelinePrivacy,
	buildFinanceTimelineEvents,
} from '@/features/finance-knowledge/services/finance-timeline.builder.service'
import { resolveFinanceHistoryEmptyCopy } from '@/features/finance-knowledge/services/finance-timeline-display.service'
import { financeTimelineProvider } from '@/features/timeline/providers/finance-timeline.provider'
import type { FinanceDocumentExtractionPayload } from '@/features/finance-knowledge/types/finance-extraction.types'
import type { FinanceDocumentAiExtraction } from '@/shared/ai/types/domain-document-extraction.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

const BASE: FinanceDocumentAiExtraction = {
	documentType: 'bank-statement',
	institution: 'HDFC Bank',
	accountType: 'Savings Account',
	cardName: null,
	loanType: null,
	investmentType: null,
	maskedAccountIdentifier: 'XXXX9012',
	accountHolder: 'Nivedan',
	jointHolder: null,
	statementDate: '2026-01-31',
	statementPeriodStart: '2026-01-01',
	statementPeriodEnd: '2026-01-31',
	currency: 'INR',
	openingBalance: 100000,
	closingBalance: 110000,
	totalAmountDue: null,
	minimumAmountDue: null,
	paymentDueDate: null,
	creditLimit: null,
	availableCredit: null,
	outstandingPrincipal: null,
	originalLoanAmount: null,
	interestRate: null,
	emi: null,
	nextPaymentDate: null,
	loanStartDate: null,
	loanEndDate: null,
	folioNumber: null,
	schemeName: null,
	units: null,
	nav: null,
	marketValue: null,
	investedValue: null,
	confidence: 0.92,
	rawFields: {},
}

function buildPayload(input: {
	documentId: string
	extraction: FinanceDocumentAiExtraction
}): FinanceDocumentExtractionPayload {
	return buildFinanceExtractionPayloadFromAi({
		documentId: input.documentId,
		documentType: input.extraction.documentType,
		extraction: input.extraction,
		extractionMethod: 'gemini_structured',
		fallbackLabel: 'Statement',
	})
}

function makeDocument(input: {
	id: string
	subCategoryId: string
	extraction: FinanceDocumentExtractionPayload
	familyMemberId?: string | null
	uploadedAt?: string
}): ChronicleDocument {
	return {
		id: input.id,
		user_id: 'user-1',
		title: 'Finance · Statement',
		file_name: 'statement.pdf',
		category_id: 'financial',
		sub_category_id: input.subCategoryId,
		status: 'active',
		family_member_id: input.familyMemberId ?? null,
		uploaded_at: input.uploadedAt ?? '2026-08-01T00:00:00.000Z',
		extracted_metadata: { financeExtraction: input.extraction },
		extracted_text: null,
		knowledge_refs: [],
		mime_type: 'application/pdf',
	} as ChronicleDocument
}

function buildKnowledge(documents: ChronicleDocument[]) {
	return buildFinanceKnowledge({
		userId: 'user-1',
		documents,
		members: [
			{
				id: 'member-a',
				displayName: 'Nivedan',
				aliases: [],
				relationship: 'self',
			},
			{
				id: 'member-b',
				displayName: 'Spouse',
				aliases: [],
				relationship: 'spouse',
			},
		],
		hasFolderAssigned: true,
	})
}

describe('finance timeline events', () => {
	it('creates a new bank account event', () => {
		const knowledge = buildKnowledge([
			makeDocument({
				id: 'bank-1',
				subCategoryId: 'bank-statement',
				extraction: buildPayload({
					documentId: 'bank-1',
					extraction: BASE,
				}),
			}),
		])

		expect(
			knowledge.timeline.some((event) => event.eventType === 'ACCOUNT_ADDED'),
		).toBe(true)
	})

	it('creates loan balance change events from June/July/August statements', () => {
		const balances = [
			{ id: 'jun', date: '2026-06-30', amount: 6520000 },
			{ id: 'jul', date: '2026-07-31', amount: 6400000 },
			{ id: 'aug', date: '2026-08-31', amount: 6280000 },
		]

		const documents = balances.map((entry) =>
			makeDocument({
				id: entry.id,
				subCategoryId: 'loan-statement',
				extraction: buildPayload({
					documentId: entry.id,
					extraction: {
						...BASE,
						documentType: 'loan-statement',
						loanType: 'Home Loan',
						maskedAccountIdentifier: 'HLXXXX4321',
						outstandingPrincipal: entry.amount,
						statementDate: entry.date,
						statementPeriodEnd: entry.date,
					},
				}),
			}),
		)

		const knowledge = buildKnowledge(documents)
		const balanceUpdates = knowledge.timeline.filter(
			(event) => event.eventType === 'LOAN_BALANCE_UPDATED',
		)

		expect(
			knowledge.historicalFacts.filter(
				(fact) => fact.factType === 'outstanding_principal',
			),
		).toHaveLength(3)
		expect(balanceUpdates).toHaveLength(2)
		expect(
			knowledge.timeline.some((event) => event.eventType === 'LOAN_ADDED'),
		).toBe(true)
	})

	it('creates one investment value update across July and August', () => {
		const documents = [
			{ id: 'inv-jul', date: '2026-07-31', value: 500000 },
			{ id: 'inv-aug', date: '2026-08-31', value: 540000 },
		].map((entry) =>
			makeDocument({
				id: entry.id,
				subCategoryId: 'investment-statement',
				extraction: buildPayload({
					documentId: entry.id,
					extraction: {
						...BASE,
						documentType: 'investment-statement',
						investmentType: 'Mutual Fund',
						marketValue: entry.value,
						statementDate: entry.date,
						statementPeriodEnd: entry.date,
					},
				}),
			}),
		)

		const knowledge = buildKnowledge(documents)
		const updates = knowledge.timeline.filter(
			(event) => event.eventType === 'INVESTMENT_VALUE_UPDATED',
		)

		expect(
			knowledge.historicalFacts.filter(
				(fact) => fact.factType === 'market_value',
			),
		).toHaveLength(2)
		expect(updates).toHaveLength(1)
		expect(
			knowledge.timeline.some((event) => event.eventType === 'ACCOUNT_ADDED'),
		).toBe(true)
	})

	it('records credit card statements without interpreting spending', () => {
		const documents = ['2026-07-31', '2026-08-31'].map((date, index) =>
			makeDocument({
				id: `cc-${index}`,
				subCategoryId: 'credit-card-statement',
				extraction: buildPayload({
					documentId: `cc-${index}`,
					extraction: {
						...BASE,
						documentType: 'credit-card-statement',
						cardName: 'Infinia',
						maskedAccountIdentifier: 'XXXX5678',
						totalAmountDue: 12000 + index * 1000,
						statementDate: date,
						statementPeriodEnd: date,
					},
				}),
			}),
		)

		const knowledge = buildKnowledge(documents)

		expect(
			knowledge.timeline.every((event) =>
				event.title.includes('Credit card statement recorded'),
			),
		).toBe(true)
		expect(
			knowledge.timeline.every(
				(event) =>
					!event.title.toLowerCase().includes('spending') &&
					!event.title.toLowerCase().includes('healthier'),
			),
		).toBe(true)
	})

	it('skips immaterial balance changes', () => {
		const derived = deriveFinanceRecordsFromDocuments([
			makeDocument({
				id: 'bank-a',
				subCategoryId: 'bank-statement',
				extraction: buildPayload({
					documentId: 'bank-a',
					extraction: {
						...BASE,
						statementDate: '2026-08-01',
						statementPeriodEnd: '2026-08-01',
						closingBalance: 100000,
					},
				}),
			}),
			makeDocument({
				id: 'bank-b',
				subCategoryId: 'bank-statement',
				extraction: buildPayload({
					documentId: 'bank-b',
					extraction: {
						...BASE,
						statementDate: '2026-08-02',
						statementPeriodEnd: '2026-08-02',
						closingBalance: 100010,
					},
				}),
			}),
		])

		const events = buildFinanceTimelineEvents({
			bankAccounts: derived.bankAccounts,
			creditCards: derived.creditCards,
			loans: derived.loans,
			investmentAccounts: derived.investmentAccounts,
			historicalFacts: derived.historicalFacts,
			documents: [],
		})

		expect(
			events.events.filter((event) => event.eventType === 'ACCOUNT_UPDATED'),
		).toHaveLength(0)
	})

	it('uses financial observation dates instead of upload timestamps', () => {
		const knowledge = buildKnowledge([
			makeDocument({
				id: 'march-statement',
				subCategoryId: 'bank-statement',
				uploadedAt: '2026-08-19T00:00:00.000Z',
				extraction: buildPayload({
					documentId: 'march-statement',
					extraction: {
						...BASE,
						statementDate: '2026-03-31',
						statementPeriodEnd: '2026-03-31',
						closingBalance: 99000,
					},
				}),
			}),
		])

		expect(knowledge.timeline[0]?.eventDate.startsWith('2026-03')).toBe(true)
		expect(knowledge.timeline[0]?.eventDate.startsWith('2026-08')).toBe(false)
	})

	it('preserves historical observations while generating timeline events', () => {
		const knowledge = buildKnowledge([
			makeDocument({
				id: 'jun',
				subCategoryId: 'loan-statement',
				extraction: buildPayload({
					documentId: 'jun',
					extraction: {
						...BASE,
						documentType: 'loan-statement',
						loanType: 'Home Loan',
						outstandingPrincipal: 6500000,
						statementDate: '2026-06-30',
						statementPeriodEnd: '2026-06-30',
					},
				}),
			}),
			makeDocument({
				id: 'aug',
				subCategoryId: 'loan-statement',
				extraction: buildPayload({
					documentId: 'aug',
					extraction: {
						...BASE,
						documentType: 'loan-statement',
						loanType: 'Home Loan',
						outstandingPrincipal: 6200000,
						statementDate: '2026-08-31',
						statementPeriodEnd: '2026-08-31',
					},
				}),
			}),
		])

		expect(
			knowledge.historicalFacts.filter(
				(fact) => fact.factType === 'outstanding_principal',
			),
		).toHaveLength(2)
		expect(
			knowledge.loans[0]?.historicalObservations.filter(
				(observation) => observation.factType === 'outstanding_principal',
			),
		).toHaveLength(2)
	})

	it('registers finance events with the global timeline provider', () => {
		const knowledge = buildKnowledge([
			makeDocument({
				id: 'bank-1',
				subCategoryId: 'bank-statement',
				extraction: buildPayload({
					documentId: 'bank-1',
					extraction: BASE,
				}),
			}),
		])

		const events = financeTimelineProvider.getEvents({
			userId: 'user-1',
			sources: { finance: { knowledge } },
		})

		expect(events).toHaveLength(knowledge.timeline.length)
		expect(events[0]?.sourceModule).toBe('finance')
		expect(events[0]?.category).toBe('life')
	})

	it('filters finance history for a selected family member', () => {
		const memberDoc = makeDocument({
			id: 'member-a-doc',
			subCategoryId: 'bank-statement',
			familyMemberId: 'member-a',
			extraction: buildPayload({
				documentId: 'member-a-doc',
				extraction: {
					...BASE,
					maskedAccountIdentifier: 'XXXX1111',
				},
			}),
		})
		const spouseDoc = makeDocument({
			id: 'member-b-doc',
			subCategoryId: 'bank-statement',
			familyMemberId: 'member-b',
			extraction: buildPayload({
				documentId: 'member-b-doc',
				extraction: {
					...BASE,
					maskedAccountIdentifier: 'XXXX2222',
				},
			}),
		})

		const allKnowledge = buildKnowledge([memberDoc, spouseDoc])
		const filteredKnowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents: [memberDoc, spouseDoc],
			members: [
				{
					id: 'member-a',
					displayName: 'Nivedan',
					aliases: [],
					relationship: 'self',
				},
			],
			hasFolderAssigned: true,
			selectedMemberId: 'member-a',
		})

		expect(allKnowledge.timeline.length).toBeGreaterThan(
			filteredKnowledge.timeline.length,
		)
	})

	it('keeps joint ownership visible in all-family view without reassignment', () => {
		const jointDoc = makeDocument({
			id: 'joint-doc',
			subCategoryId: 'bank-statement',
			familyMemberId: 'member-a',
			extraction: buildPayload({
				documentId: 'joint-doc',
				extraction: {
					...BASE,
					jointHolder: 'Spouse',
				},
			}),
		})

		const allFamilyKnowledge = buildKnowledge([jointDoc])

		expect(allFamilyKnowledge.bankAccounts[0]?.ownership).toBe('joint')
	})

	it('masks sensitive timeline previews when privacy is enabled', () => {
		const knowledge = buildKnowledge([
			makeDocument({
				id: 'loan-jun',
				subCategoryId: 'loan-statement',
				extraction: buildPayload({
					documentId: 'loan-jun',
					extraction: {
						...BASE,
						documentType: 'loan-statement',
						outstandingPrincipal: 6500000,
						statementDate: '2026-06-30',
						statementPeriodEnd: '2026-06-30',
					},
				}),
			}),
			makeDocument({
				id: 'loan-aug',
				subCategoryId: 'loan-statement',
				extraction: buildPayload({
					documentId: 'loan-aug',
					extraction: {
						...BASE,
						documentType: 'loan-statement',
						outstandingPrincipal: 6200000,
						statementDate: '2026-08-31',
						statementPeriodEnd: '2026-08-31',
					},
				}),
			}),
		])

		const update = knowledge.timeline.find(
			(event) => event.eventType === 'LOAN_BALANCE_UPDATED',
		)
		const masked = applyFinanceTimelinePrivacy(update!, {
			maskAccountNumbers: true,
			hideBalancesInLists: true,
			hideSensitiveTimelinePreviews: true,
		})

		expect(masked.metadata.previousValue).toBeNull()
		expect(masked.metadata.currentValue).toBeNull()
	})

	it('links timeline events to source documents', () => {
		const knowledge = buildKnowledge([
			makeDocument({
				id: 'bank-1',
				subCategoryId: 'bank-statement',
				extraction: buildPayload({
					documentId: 'bank-1',
					extraction: BASE,
				}),
			}),
		])

		expect(knowledge.timeline[0]?.sourceDocumentIds).toContain('bank-1')
		expect(knowledge.timeline[0]?.metadata.sourceDocumentLabel).toBeTruthy()
	})

	it('keeps snapshot values consistent with timeline observations', () => {
		const knowledge = buildKnowledge([
			makeDocument({
				id: 'loan-aug',
				subCategoryId: 'loan-statement',
				extraction: buildPayload({
					documentId: 'loan-aug',
					extraction: {
						...BASE,
						documentType: 'loan-statement',
						outstandingPrincipal: 6280000,
						statementDate: '2026-08-31',
						statementPeriodEnd: '2026-08-31',
					},
				}),
			}),
		])

		const loan = knowledge.loans[0]
		const currentPrincipal = loan?.currentFacts.find(
			(fact) => fact.factType === 'outstanding_principal',
		)

		expect(currentPrincipal?.value).toContain('62')
		expect(
			knowledge.timeline.some(
				(event) =>
					event.metadata.currentValue?.includes('62,80,000') ||
					event.metadata.currentValue?.includes('6280000'),
			),
		).toBe(true)
	})

	it('uses calm empty-state copy when no events exist', () => {
		const empty = resolveFinanceHistoryEmptyCopy({
			hasDocuments: false,
			eventCount: 0,
		})
		const organizing = resolveFinanceHistoryEmptyCopy({
			hasDocuments: true,
			eventCount: 0,
		})

		expect(empty.body.toLowerCase()).not.toContain('no timeline events')
		expect(organizing.body).toContain('Financial history will appear')
	})

	it('does not duplicate events for duplicate downloads of the same observation', () => {
		const derived = deriveFinanceRecordsFromDocuments([
			makeDocument({
				id: 'doc-1',
				subCategoryId: 'bank-statement',
				extraction: buildPayload({
					documentId: 'doc-1',
					extraction: {
						...BASE,
						statementDate: '2026-08-31',
						statementPeriodEnd: '2026-08-31',
						closingBalance: 120000,
					},
				}),
			}),
			makeDocument({
				id: 'doc-2',
				subCategoryId: 'bank-statement',
				uploadedAt: '2026-08-20T00:00:00.000Z',
				extraction: buildPayload({
					documentId: 'doc-2',
					extraction: {
						...BASE,
						statementDate: '2026-08-31',
						statementPeriodEnd: '2026-08-31',
						closingBalance: 120000,
					},
				}),
			}),
		])

		const events = buildFinanceTimelineEvents({
			bankAccounts: derived.bankAccounts,
			creditCards: derived.creditCards,
			loans: derived.loans,
			investmentAccounts: derived.investmentAccounts,
			historicalFacts: derived.historicalFacts,
			documents: [],
		})

		expect(
			events.events.filter((event) => event.eventType === 'ACCOUNT_ADDED'),
		).toHaveLength(1)
	})

	it('surfaces recent activity on Finance Home from the same timeline source', () => {
		const knowledge = buildKnowledge([
			makeDocument({
				id: 'loan-jun',
				subCategoryId: 'loan-statement',
				extraction: buildPayload({
					documentId: 'loan-jun',
					extraction: {
						...BASE,
						documentType: 'loan-statement',
						outstandingPrincipal: 6500000,
						statementDate: '2026-06-30',
						statementPeriodEnd: '2026-06-30',
					},
				}),
			}),
			makeDocument({
				id: 'loan-aug',
				subCategoryId: 'loan-statement',
				extraction: buildPayload({
					documentId: 'loan-aug',
					extraction: {
						...BASE,
						documentType: 'loan-statement',
						outstandingPrincipal: 6200000,
						statementDate: '2026-08-31',
						statementPeriodEnd: '2026-08-31',
					},
				}),
			}),
		])

		const home = buildFinanceHomeViewModel({ knowledge })

		expect(home.recentActivity.length).toBeGreaterThan(0)
		expect(home.recentActivity[0]?.id).toBe(knowledge.timeline.at(-1)?.id)
	})
})
