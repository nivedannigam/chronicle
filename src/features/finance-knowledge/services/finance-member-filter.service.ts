import type {
	BankAccountRecord,
	CreditCardRecord,
	FinanceOwnership,
	InvestmentAccountRecord,
	LoanRecord,
} from '@/features/finance-knowledge/types/finance-knowledge.types'
import type { DerivedFinanceRecords } from '@/features/finance-knowledge/services/derive-finance-records-from-documents.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

type FinanceEntityRecord =
	BankAccountRecord | CreditCardRecord | LoanRecord | InvestmentAccountRecord

function isEntityVisibleToMember(input: {
	entity: FinanceEntityRecord
	selectedMemberId: string | null
	documents: ChronicleDocument[]
}): boolean {
	if (!input.selectedMemberId) {
		return true
	}

	if (
		input.entity.ownership === 'joint' ||
		input.entity.ownership === 'family'
	) {
		return (
			input.entity.ownerMemberIds.length === 0 ||
			input.entity.ownerMemberIds.includes(input.selectedMemberId)
		)
	}

	if (input.entity.ownerMemberIds.includes(input.selectedMemberId)) {
		return true
	}

	return input.documents.some(
		(document) =>
			input.entity.sourceDocumentIds.includes(document.id) &&
			document.family_member_id === input.selectedMemberId,
	)
}

export function filterFinanceEntitiesForMember(input: {
	derived: DerivedFinanceRecords
	documents: ChronicleDocument[]
	selectedMemberId?: string | null
}): DerivedFinanceRecords {
	if (!input.selectedMemberId) {
		return input.derived
	}

	const filterEntities = <T extends FinanceEntityRecord>(entities: T[]): T[] =>
		entities.filter((entity) =>
			isEntityVisibleToMember({
				entity,
				selectedMemberId: input.selectedMemberId ?? null,
				documents: input.documents,
			}),
		)

	const visibleEntityIds = new Set<string>([
		...filterEntities(input.derived.bankAccounts).map((entity) => entity.id),
		...filterEntities(input.derived.creditCards).map((entity) => entity.id),
		...filterEntities(input.derived.loans).map((entity) => entity.id),
		...filterEntities(input.derived.investmentAccounts).map(
			(entity) => entity.id,
		),
	])

	return {
		bankAccounts: filterEntities(input.derived.bankAccounts),
		creditCards: filterEntities(input.derived.creditCards),
		loans: filterEntities(input.derived.loans),
		investmentAccounts: filterEntities(input.derived.investmentAccounts),
		financialFacts: input.derived.financialFacts.filter((fact) =>
			visibleEntityIds.has(fact.entityId),
		),
		currentFacts: input.derived.currentFacts.filter((fact) =>
			visibleEntityIds.has(fact.entityId),
		),
		historicalFacts: input.derived.historicalFacts.filter((fact) =>
			visibleEntityIds.has(fact.entityId),
		),
	}
}

export function mergeEntityOwnership(
	current: FinanceOwnership,
	incoming: FinanceOwnership,
): FinanceOwnership {
	if (current === 'joint' || incoming === 'joint') {
		return 'joint'
	}

	if (current === 'family' || incoming === 'family') {
		return 'family'
	}

	if (current === 'individual' || incoming === 'individual') {
		return current === 'unknown' ? incoming : current
	}

	return incoming
}
