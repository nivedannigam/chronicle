import { describe, expect, it } from 'vitest'
import { buildFinanceExtractionPayloadFromAi } from '@/features/finance-knowledge/services/derive-finance-records-from-documents.service'
import { buildFinanceKnowledge } from '@/features/finance-knowledge/services/finance-knowledge.builder'
import { planAndResolveFinanceEvidence } from '@/shared/ai/evidence-planning/plan-finance-evidence'
import { resolveFinanceEvidence } from '@/features/finance/evidence/finance-evidence.resolver'
import type { FinanceDocumentExtractionPayload } from '@/features/finance-knowledge/types/finance-extraction.types'
import type { FinanceDocumentAiExtraction } from '@/shared/ai/types/domain-document-extraction.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { FinanceKnowledge } from '@/features/finance-knowledge/types/finance-knowledge.types'

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
	statementDate: '2026-08-31',
	statementPeriodStart: '2026-08-01',
	statementPeriodEnd: '2026-08-31',
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
}): ChronicleDocument {
	return {
		id: input.id,
		user_id: 'user-1',
		title: 'Finance · Statement',
		file_name: 'statement.pdf',
		category_id: 'financial',
		sub_category_id: input.subCategoryId,
		status: 'active',
		family_member_id: null,
		uploaded_at: '2026-08-19T00:00:00.000Z',
		extracted_metadata: { financeExtraction: input.extraction },
		extracted_text: null,
		knowledge_refs: [],
		mime_type: 'application/pdf',
	} as ChronicleDocument
}

function buildPortfolioKnowledge(): FinanceKnowledge {
	const documents = [
		makeDocument({
			id: 'hdfc-savings',
			subCategoryId: 'bank-statement',
			extraction: buildPayload({
				documentId: 'hdfc-savings',
				extraction: {
					...BASE,
					institution: 'HDFC Bank',
					maskedAccountIdentifier: 'XXXX9012',
					closingBalance: 250000,
				},
			}),
		}),
		makeDocument({
			id: 'icici-salary',
			subCategoryId: 'bank-statement',
			extraction: buildPayload({
				documentId: 'icici-salary',
				extraction: {
					...BASE,
					institution: 'ICICI Bank',
					accountType: 'Salary Account',
					maskedAccountIdentifier: 'XXXX3456',
					closingBalance: 180000,
				},
			}),
		}),
		makeDocument({
			id: 'mf-axis',
			subCategoryId: 'investment-statement',
			extraction: buildPayload({
				documentId: 'mf-axis',
				extraction: {
					...BASE,
					documentType: 'investment-statement',
					institution: 'Axis Mutual Fund',
					investmentType: 'Mutual Fund',
					marketValue: 540000,
				},
			}),
		}),
		makeDocument({
			id: 'mf-hdfc',
			subCategoryId: 'investment-statement',
			extraction: buildPayload({
				documentId: 'mf-hdfc',
				extraction: {
					...BASE,
					documentType: 'investment-statement',
					institution: 'HDFC Mutual Fund',
					investmentType: 'Mutual Fund',
					marketValue: 320000,
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
					loanType: 'Home Loan',
					maskedAccountIdentifier: 'HLXXXX4321',
					outstandingPrincipal: 6280000,
				},
			}),
		}),
		makeDocument({
			id: 'cc-aug',
			subCategoryId: 'credit-card-statement',
			extraction: buildPayload({
				documentId: 'cc-aug',
				extraction: {
					...BASE,
					documentType: 'credit-card-statement',
					cardName: 'Infinia',
					maskedAccountIdentifier: 'XXXX5678',
					totalAmountDue: 42000,
				},
			}),
		}),
	]

	return buildFinanceKnowledge({
		userId: 'user-1',
		documents,
		members: [],
		hasFolderAssigned: true,
	})
}

describe('finance evidence resolver', () => {
	it('selects broad evidence for financial position overview', () => {
		const knowledge = buildPortfolioKnowledge()
		const resolved = planAndResolveFinanceEvidence({
			question: 'How is my financial position?',
			knowledge,
		})

		expect(resolved.questionType).toBe('STATUS_OVERVIEW')
		expect(resolved.evidenceBundle.metrics.length).toBeGreaterThanOrEqual(4)
		expect(resolved.evidenceBundle.reports.length).toBeGreaterThanOrEqual(4)
		expect(
			resolved.evidenceBundle.summary.lines.some((line) =>
				line.toLowerCase().includes('liabilit'),
			),
		).toBe(true)
	})

	it('prioritizes only HDFC account evidence for balance lookup', () => {
		const knowledge = buildPortfolioKnowledge()
		const resolved = planAndResolveFinanceEvidence({
			question: 'How much do I have in my HDFC account?',
			knowledge,
		})

		expect(resolved.questionType).toBe('FACT_LOOKUP')
		expect(resolved.evidenceBundle.metrics).toHaveLength(1)
		expect(resolved.evidenceBundle.metrics[0]?.displayName).toContain('HDFC')
		expect(resolved.evidenceBundle.reports.length).toBeLessThanOrEqual(1)
	})

	it('returns all loans for entity lookup', () => {
		const knowledge = buildPortfolioKnowledge()
		const resolved = planAndResolveFinanceEvidence({
			question: 'What loans do I have?',
			knowledge,
		})

		expect(resolved.questionType).toBe('ENTITY_LOOKUP')
		expect(
			resolved.evidenceBundle.summary.lines.some((line) =>
				line.toLowerCase().includes('loan'),
			),
		).toBe(true)
	})

	it('selects historical loan observations for trend questions', () => {
		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents: [
				makeDocument({
					id: 'loan-jun',
					subCategoryId: 'loan-statement',
					extraction: buildPayload({
						documentId: 'loan-jun',
						extraction: {
							...BASE,
							documentType: 'loan-statement',
							loanType: 'Home Loan',
							outstandingPrincipal: 6520000,
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
							loanType: 'Home Loan',
							outstandingPrincipal: 6280000,
							statementDate: '2026-08-31',
							statementPeriodEnd: '2026-08-31',
						},
					}),
				}),
			],
			members: [],
			hasFolderAssigned: true,
		})

		const resolved = planAndResolveFinanceEvidence({
			question: 'How has my home loan changed?',
			knowledge,
		})

		expect(resolved.questionType).toBe('TREND')
		expect(resolved.evidenceBundle.metrics.length).toBeGreaterThanOrEqual(2)
		expect(resolved.evidenceBundle.trends.length).toBe(1)
	})

	it('includes coverage limitations for completeness questions', () => {
		const knowledge = buildPortfolioKnowledge()
		const resolved = planAndResolveFinanceEvidence({
			question: 'Do you have all my financial information?',
			knowledge,
		})

		expect(resolved.questionType).toBe('COVERAGE')
		expect(resolved.evidenceBundle.summary.limitations.length).toBeGreaterThan(
			0,
		)
		expect(
			resolved.evidenceBundle.summary.lines.some((line) =>
				line.includes('bank'),
			),
		).toBe(true)
	})

	it('uses statement date rather than upload date for latest report', () => {
		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents: [
				makeDocument({
					id: 'march-statement',
					subCategoryId: 'bank-statement',
					extraction: buildPayload({
						documentId: 'march-statement',
						extraction: {
							...BASE,
							statementDate: '2026-03-31',
							statementPeriodEnd: '2026-03-31',
							closingBalance: 90000,
						},
					}),
				}),
			],
			members: [],
			hasFolderAssigned: true,
		})

		const resolved = planAndResolveFinanceEvidence({
			question: 'What is my latest financial statement?',
			knowledge,
		})

		expect(resolved.evidenceBundle.reports[0]?.date.startsWith('2026-03')).toBe(
			true,
		)
	})

	it('deduplicates repeated metric evidence', () => {
		const knowledge = buildPortfolioKnowledge()
		const bundle = resolveFinanceEvidence({
			knowledge,
			request: {
				question: 'How is my financial position?',
				questionType: 'STATUS_OVERVIEW',
				domain: 'finance',
				subject: {},
			},
		})

		const metricKeys = bundle.metrics.map(
			(metric) => `${metric.canonicalId}:${metric.observedAt}:${metric.value}`,
		)
		expect(new Set(metricKeys).size).toBe(metricKeys.length)
	})

	it('routes entity context from scope', () => {
		const knowledge = buildPortfolioKnowledge()
		const loan = knowledge.loans[0]
		const resolved = planAndResolveFinanceEvidence({
			question: 'What is the balance?',
			knowledge,
			scope: { entityId: loan?.id },
		})

		expect(resolved.evidenceBundle.metrics[0]?.displayName).toContain(
			loan?.displayName ?? 'Loan',
		)
	})

	it('explains net worth changes without advisory language', () => {
		const knowledge = buildPortfolioKnowledge()
		const resolved = planAndResolveFinanceEvidence({
			question: 'Why did my net worth change?',
			knowledge,
		})

		expect(resolved.questionType).toBe('EXPLAIN')
		expect(
			resolved.evidenceBundle.summary.limitations.some((line) =>
				line.toLowerCase().includes('does not infer causes'),
			),
		).toBe(true)
		expect(
			resolved.evidenceBundle.summary.lines.every(
				(line) => !line.toLowerCase().includes('financially healthier'),
			),
		).toBe(true)
	})

	it('warns when compare coverage changed materially', () => {
		const knowledge = buildPortfolioKnowledge()
		const resolved = planAndResolveFinanceEvidence({
			question: 'How is my financial position compared with last year?',
			knowledge,
		})

		expect(resolved.questionType).toBe('COMPARE')
		expect(resolved.evidenceBundle.summary.limitations.length).toBeGreaterThan(
			0,
		)
	})
})

describe('finance ask routing', () => {
	it('builds finance ask path with entity context', async () => {
		const { financeAskPath } = await import('@/constants/routes')
		expect(
			financeAskPath({
				q: 'How is my financial position?',
				entityId: 'loan-1',
			}),
		).toBe(
			'/ask?context=finance&q=How+is+my+financial+position%3F&entity=loan-1',
		)
	})
})
