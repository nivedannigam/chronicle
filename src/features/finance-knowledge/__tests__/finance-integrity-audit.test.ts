import { describe, expect, it } from 'vitest'
import {
	runFinanceIntegrityAudit,
	formatFinanceIntegrityAuditReport,
} from '@/features/finance-knowledge/services/finance-integrity-audit.service'
import { buildFinanceKnowledge } from '@/features/finance-knowledge/services/finance-knowledge.builder'
import { buildFinanceSnapshot } from '@/features/finance-knowledge/services/finance-snapshot.service'
import type { FinanceCoverageMeta } from '@/features/finance-knowledge/types/finance-history.types'
import type {
	BankAccountRecord,
	FinanceCurrentFact,
	FinanceEntityBase,
	LoanRecord,
} from '@/features/finance-knowledge/types/finance-knowledge.types'

const BASE_COVERAGE: FinanceCoverageMeta = {
	level: 'partial',
	entityCount: 2,
	documentCount: 2,
	extractedDocumentCount: 2,
	incompleteDocumentCount: 0,
	ambiguousEntityCount: 0,
	conflictingObservationCount: 0,
}

function makeCurrentFact(input: {
	entityId: string
	factType: string
	value: string
}): FinanceCurrentFact {
	return {
		entityId: input.entityId,
		factType: input.factType,
		value: input.value,
		asOfDate: '2026-08-31',
		previousValue: null,
		previousAsOfDate: null,
		changeFromPrevious: null,
		sourceDocumentId: 'doc-1',
		confidence: 'high',
		hasConflict: false,
		conflictingSourceDocumentIds: [],
	}
}

function makeEntityBase(input: {
	id: string
	displayName: string
	currentFacts: FinanceCurrentFact[]
}): FinanceEntityBase {
	return {
		id: input.id,
		displayName: input.displayName,
		institutionName: 'Test Bank',
		maskedIdentifier: '•••• 1234',
		ownership: 'individual',
		ownerMemberIds: [],
		status: 'active',
		facts: [],
		currentFacts: input.currentFacts,
		historicalObservations: [],
		resolutionState: 'matched',
		latestStatementDate: '2026-08-31',
		conflictingFactTypes: [],
		sourceDocumentIds: ['doc-1'],
		lastUpdatedFromDocumentAt: '2026-08-01T00:00:00.000Z',
	}
}

function makeBank(id: string, closingBalance: number): BankAccountRecord {
	return {
		...makeEntityBase({
			id,
			displayName: `Bank ${id}`,
			currentFacts: [
				makeCurrentFact({
					entityId: id,
					factType: 'closing_balance',
					value: `INR ${closingBalance.toLocaleString('en-IN')}`,
				}),
			],
		}),
		kind: 'bank_account',
	}
}

describe('runFinanceIntegrityAudit', () => {
	it('reports funnel counts for organized finance documents', () => {
		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents: [],
			members: [],
			hasFolderAssigned: false,
		})

		const result = runFinanceIntegrityAudit({
			documents: [],
			knowledge,
		})

		expect(result.summary.documentsDiscovered).toBe(0)
		expect(result.summary.entitiesCreated).toBe(0)
		expect(result.summary.snapshotShowsNetWorth).toBe(false)
		expect(result.liveValidation).toBe('pending')
		expect(result.askSamples.length).toBeGreaterThan(0)
	})

	it('flags snapshot blockers when liability entities lack valued totals', () => {
		const loanWithoutBalance: LoanRecord = {
			...makeEntityBase({
				id: 'loan-empty',
				displayName: 'Home Loan',
				currentFacts: [],
			}),
			kind: 'loan',
			loanType: 'Home Loan',
		}
		const bankAccounts = [makeBank('bank-a', 500000)]

		const snapshot = buildFinanceSnapshot({
			bankAccounts,
			investmentAccounts: [],
			creditCards: [],
			loans: [loanWithoutBalance],
			holdings: [],
			documents: [],
			coverage: BASE_COVERAGE,
		})

		const knowledge = {
			...buildFinanceKnowledge({
				userId: 'user-1',
				documents: [],
				members: [],
				hasFolderAssigned: true,
			}),
			bankAccounts,
			loans: [loanWithoutBalance],
			creditCards: [],
			investmentAccounts: [],
			snapshot,
		}

		const result = runFinanceIntegrityAudit({
			documents: [],
			knowledge,
		})

		expect(result.findings.snapshotBlockers.length).toBeGreaterThan(0)
		expect(formatFinanceIntegrityAuditReport(result)).toContain(
			'Snapshot blockers',
		)
	})
})
