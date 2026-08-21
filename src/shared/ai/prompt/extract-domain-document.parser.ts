import type {
	FinanceDocumentAiExtraction,
	InsuranceDocumentExtraction,
	VehicleDocumentAiExtraction,
} from '@/shared/ai/types/domain-document-extraction.types'
import type { FinanceExtractableDocumentType } from '@/features/finance-knowledge/types/finance-extraction.types'
import type { InsurancePolicyType } from '@/features/insurance-knowledge/types/insurance-record.types'
import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'

const POLICY_TYPES = new Set<InsurancePolicyType>([
	'health',
	'life_term',
	'motor',
	'home',
	'travel',
	'other',
])

const VEHICLE_TYPES = new Set<VehicleDocumentTypeId>([
	'registration',
	'insurance',
	'compliance',
	'service',
	'warranty',
	'purchase_finance',
	'other',
])

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}

	if (typeof value === 'string') {
		const parsed = Number.parseFloat(value.replace(/,/g, ''))
		return Number.isNaN(parsed) ? null : parsed
	}

	return null
}

function readDate(value: unknown): string | null {
	const raw = readString(value)
	if (!raw) return null
	const parsed = Date.parse(raw)
	return Number.isNaN(parsed) ? null : raw.slice(0, 10)
}

export function parseInsuranceExtractionJson(
	content: string,
): InsuranceDocumentExtraction {
	const parsed = JSON.parse(content) as Record<string, unknown>
	const policyTypeRaw = readString(parsed.policyType)
	const policyType =
		policyTypeRaw && POLICY_TYPES.has(policyTypeRaw as InsurancePolicyType)
			? (policyTypeRaw as InsurancePolicyType)
			: null

	return {
		insurer: readString(parsed.insurer),
		policyNumber: readString(parsed.policyNumber),
		policyType,
		productName: readString(parsed.productName),
		inceptionDate: readDate(parsed.inceptionDate),
		expiryDate: readDate(parsed.expiryDate),
		renewalDate: readDate(parsed.renewalDate),
		sumInsured: readNumber(parsed.sumInsured),
		premium: readNumber(parsed.premium),
		currency: readString(parsed.currency) ?? 'INR',
		insuredMembers: Array.isArray(parsed.insuredMembers)
			? parsed.insuredMembers
					.filter((entry): entry is string => typeof entry === 'string')
					.map((entry) => entry.trim())
					.filter(Boolean)
			: [],
		documentKind: readString(parsed.documentKind),
		confidence: readNumber(parsed.confidence) ?? 0.7,
		rawFields: parsed as Record<string, string | number | null>,
	}
}

export function parseVehicleExtractionJson(
	content: string,
): VehicleDocumentAiExtraction {
	const parsed = JSON.parse(content) as Record<string, unknown>
	const documentTypeRaw = readString(parsed.documentType)
	const documentType =
		documentTypeRaw &&
		VEHICLE_TYPES.has(documentTypeRaw as VehicleDocumentTypeId)
			? (documentTypeRaw as VehicleDocumentTypeId)
			: null

	const facts = Array.isArray(parsed.facts)
		? parsed.facts
				.filter(
					(entry): entry is Record<string, unknown> =>
						typeof entry === 'object' && entry != null,
				)
				.map((entry) => ({
					factKey: readString(entry.factKey) ?? 'unknown',
					factValue: readString(entry.factValue),
					valueDate: readDate(entry.valueDate),
					valueNumber: readNumber(entry.valueNumber),
				}))
				.filter((entry) => entry.factKey !== 'unknown')
		: []

	return {
		documentType,
		documentSubtype: readString(parsed.documentSubtype),
		registrationNumber: readString(parsed.registrationNumber),
		vin: readString(parsed.vin),
		engineNumber: readString(parsed.engineNumber),
		make: readString(parsed.make),
		model: readString(parsed.model),
		variant: readString(parsed.variant),
		documentDate: readDate(parsed.documentDate),
		expiryDate: readDate(parsed.expiryDate),
		provider: readString(parsed.provider),
		facts,
		confidence: readNumber(parsed.confidence) ?? 0.7,
		rawFields: parsed as Record<string, string | number | null>,
	}
}

function countMeaningfulStrings(values: Array<string | null>): number {
	return values.filter((value) => value != null && value.trim()).length
}

export function isInsuranceExtractionSufficient(
	extraction: InsuranceDocumentExtraction,
): boolean {
	const coreFields = countMeaningfulStrings([
		extraction.policyNumber,
		extraction.insurer,
		extraction.productName,
	])
	const dateFields = countMeaningfulStrings([
		extraction.inceptionDate,
		extraction.expiryDate,
		extraction.renewalDate,
	])
	const numericFields =
		(extraction.sumInsured != null ? 1 : 0) +
		(extraction.premium != null ? 1 : 0)

	if (extraction.policyNumber && extraction.insurer) {
		return true
	}

	return coreFields + dateFields + numericFields >= 3
}

export function isVehicleExtractionSufficient(
	extraction: VehicleDocumentAiExtraction,
): boolean {
	const identifierCount = countMeaningfulStrings([
		extraction.registrationNumber,
		extraction.vin,
		extraction.engineNumber,
	])
	const detailCount = countMeaningfulStrings([
		extraction.make,
		extraction.model,
		extraction.documentDate,
		extraction.expiryDate,
		extraction.provider,
	])

	if (
		identifierCount >= 1 &&
		(detailCount >= 1 || extraction.facts.length >= 2)
	) {
		return true
	}

	return identifierCount >= 1 && extraction.facts.length >= 3
}

export function validateInsuranceExtractionJson(
	content: string,
): InsuranceDocumentExtraction {
	const parsed = parseInsuranceExtractionJson(content)

	if (!isInsuranceExtractionSufficient(parsed)) {
		throw new Error(
			'Insurance extraction returned insufficient structured data.',
		)
	}

	return parsed
}

const FINANCE_TYPES = new Set<FinanceExtractableDocumentType>([
	'bank-statement',
	'credit-card-statement',
	'loan-statement',
	'investment-statement',
])

export function parseFinanceExtractionJson(
	content: string,
): FinanceDocumentAiExtraction {
	const parsed = JSON.parse(content) as Record<string, unknown>
	const documentTypeRaw = readString(parsed.documentType)
	const documentType =
		documentTypeRaw &&
		FINANCE_TYPES.has(documentTypeRaw as FinanceExtractableDocumentType)
			? (documentTypeRaw as FinanceExtractableDocumentType)
			: 'bank-statement'

	return {
		documentType,
		institution: readString(parsed.institution),
		accountType: readString(parsed.accountType),
		cardName: readString(parsed.cardName),
		loanType: readString(parsed.loanType),
		investmentType: readString(parsed.investmentType),
		maskedAccountIdentifier: readString(parsed.maskedAccountIdentifier),
		accountHolder: readString(parsed.accountHolder),
		jointHolder: readString(parsed.jointHolder),
		statementDate: readDate(parsed.statementDate),
		statementPeriodStart: readDate(parsed.statementPeriodStart),
		statementPeriodEnd: readDate(parsed.statementPeriodEnd),
		currency: readString(parsed.currency) ?? 'INR',
		openingBalance: readNumber(parsed.openingBalance),
		closingBalance: readNumber(parsed.closingBalance),
		totalAmountDue: readNumber(parsed.totalAmountDue),
		minimumAmountDue: readNumber(parsed.minimumAmountDue),
		paymentDueDate: readDate(parsed.paymentDueDate),
		creditLimit: readNumber(parsed.creditLimit),
		availableCredit: readNumber(parsed.availableCredit),
		outstandingPrincipal: readNumber(parsed.outstandingPrincipal),
		originalLoanAmount: readNumber(parsed.originalLoanAmount),
		interestRate: readNumber(parsed.interestRate),
		emi: readNumber(parsed.emi),
		nextPaymentDate: readDate(parsed.nextPaymentDate),
		loanStartDate: readDate(parsed.loanStartDate),
		loanEndDate: readDate(parsed.loanEndDate),
		folioNumber: readString(parsed.folioNumber),
		schemeName: readString(parsed.schemeName),
		units: readNumber(parsed.units),
		nav: readNumber(parsed.nav),
		marketValue: readNumber(parsed.marketValue),
		investedValue: readNumber(parsed.investedValue),
		confidence: readNumber(parsed.confidence) ?? 0.7,
		rawFields: parsed as Record<string, string | number | null>,
	}
}

export function isFinanceExtractionSufficient(
	extraction: FinanceDocumentAiExtraction,
): boolean {
	const institution = extraction.institution?.trim()
	const identifier = extraction.maskedAccountIdentifier?.trim()
	const statementDate = extraction.statementDate

	const numericFields =
		(extraction.openingBalance != null ? 1 : 0) +
		(extraction.closingBalance != null ? 1 : 0) +
		(extraction.totalAmountDue != null ? 1 : 0) +
		(extraction.outstandingPrincipal != null ? 1 : 0) +
		(extraction.marketValue != null ? 1 : 0)

	if (institution && (identifier || statementDate || numericFields >= 1)) {
		return true
	}

	return Boolean(institution && numericFields >= 1)
}

export function validateFinanceExtractionJson(
	content: string,
): FinanceDocumentAiExtraction {
	const parsed = parseFinanceExtractionJson(content)

	if (!isFinanceExtractionSufficient(parsed)) {
		throw new Error('Finance extraction returned insufficient structured data.')
	}

	return parsed
}

export function validateVehicleExtractionJson(
	content: string,
): VehicleDocumentAiExtraction {
	const parsed = parseVehicleExtractionJson(content)

	if (!isVehicleExtractionSufficient(parsed)) {
		throw new Error('Vehicle extraction returned insufficient structured data.')
	}

	return parsed
}
