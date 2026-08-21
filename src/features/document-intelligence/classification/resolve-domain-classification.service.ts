import type { InsurancePolicyType } from '@/features/insurance-knowledge/types/insurance-record.types'
import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'
import type { FinanceDocumentType } from '@/features/finance-knowledge/types/finance-classification.types'
import {
	resolveClassificationPrecedence,
	type ClassificationDecision,
	type ClassificationSource,
} from '@/features/document-intelligence/classification/classification-precedence.contract'

const MIN_AI_CLASSIFICATION_CONFIDENCE = 0.45

function mapCategoryHintToPolicyType(
	categoryHint: string | null | undefined,
): InsurancePolicyType | null {
	switch (categoryHint as PolicyCategoryId | null) {
		case 'health':
			return 'health'
		case 'motor':
			return 'motor'
		case 'home':
			return 'home'
		case 'life_term':
			return 'life_term'
		case 'travel':
			return 'travel'
		default:
			return null
	}
}

export function inferInsurancePolicyTypeFromFileName(
	fileName: string,
): InsurancePolicyType | null {
	const lower = fileName.toLowerCase()

	if (/\bhome\b|\bproperty\b|\bhouse\b|\bhomeowner\b/.test(lower)) {
		return 'home'
	}

	if (/\bhealth\b|\bmediclaim\b|\bmedical\b/.test(lower)) {
		return 'health'
	}

	if (/\bmotor\b|\bvehicle\b|\bcar\b|\bbike\b|\bxev\b|\bauto\b/.test(lower)) {
		return 'motor'
	}

	if (/\blife\b|\bterm\b/.test(lower)) {
		return 'life_term'
	}

	if (/\btravel\b/.test(lower)) {
		return 'travel'
	}

	return null
}

export function inferInsurancePolicyTypeFromFolderPath(
	folderPath: string | null | undefined,
): InsurancePolicyType | null {
	const lower = (folderPath ?? '').toLowerCase()

	if (/\/home\b|\bhome\//.test(lower)) {
		return 'home'
	}

	if (/\/health\b|\bhealth\//.test(lower)) {
		return 'health'
	}

	if (/\/motor\b|\bmotor\//.test(lower)) {
		return 'motor'
	}

	if (/\/life\b|\blife\//.test(lower)) {
		return 'life_term'
	}

	if (/\/travel\b|\btravel\//.test(lower)) {
		return 'travel'
	}

	return null
}

function buildCandidate(
	classification: string,
	source: ClassificationSource,
	confidence: number,
): ClassificationDecision {
	return {
		classification,
		source,
		confidence,
		provenance:
			source === 'CONTENT_AI' || source === 'CONTENT_PARSER'
				? 'AI_EXTRACTED'
				: 'INFERRED',
		needsReview: false,
	}
}

export function resolveInsurancePolicyClassification(input: {
	aiPolicyType: InsurancePolicyType | null | undefined
	aiConfidence: number
	categoryHint?: string | null
	fileName: string
	folderPath?: string | null
}): ClassificationDecision & { policyType: InsurancePolicyType } {
	const candidates: ClassificationDecision[] = []

	if (
		input.aiPolicyType &&
		input.aiPolicyType !== 'other' &&
		input.aiConfidence >= MIN_AI_CLASSIFICATION_CONFIDENCE
	) {
		candidates.push(
			buildCandidate(input.aiPolicyType, 'CONTENT_AI', input.aiConfidence),
		)
	}

	const folderType =
		mapCategoryHintToPolicyType(input.categoryHint) ??
		inferInsurancePolicyTypeFromFolderPath(input.folderPath)

	if (folderType) {
		candidates.push(buildCandidate(folderType, 'FOLDER', 0.75))
	}

	const fileType = inferInsurancePolicyTypeFromFileName(input.fileName)

	if (fileType) {
		candidates.push(buildCandidate(fileType, 'FILENAME', 0.65))
	}

	const resolved = resolveClassificationPrecedence(candidates)
	const policyType =
		resolved.classification === 'unknown'
			? 'other'
			: (resolved.classification as InsurancePolicyType)

	return { ...resolved, policyType }
}

export function resolveVehicleDocumentClassification(input: {
	fileName: string
	folderPath?: string | null
	aiDocumentType?: VehicleDocumentTypeId | null
	aiDocumentSubtype?: string | null
	aiConfidence?: number
}): ClassificationDecision & {
	documentType: VehicleDocumentTypeId
	documentSubtype: string
} {
	const candidates: ClassificationDecision[] = []

	if (
		input.aiDocumentType &&
		input.aiDocumentType !== 'other' &&
		(input.aiConfidence ?? 0) >= MIN_AI_CLASSIFICATION_CONFIDENCE
	) {
		const aiSubtype =
			input.aiDocumentSubtype ??
			(input.aiDocumentType === 'insurance' ? 'motor_policy' : 'unknown')
		candidates.push(
			buildCandidate(
				`${input.aiDocumentType}:${aiSubtype}`,
				'CONTENT_AI',
				input.aiConfidence ?? 0.7,
			),
		)
	}

	const folderPath = input.folderPath ?? ''
	const folderRules: Array<{
		pattern: RegExp
		type: VehicleDocumentTypeId
		subtype: string
	}> = [
		{
			pattern: /\bvehicles?\b.*\binsurance\b|\binsurance\b/i,
			type: 'insurance',
			subtype: 'motor_policy',
		},
		{ pattern: /\brc\b|registration/i, type: 'registration', subtype: 'rc' },
		{ pattern: /\bpuc\b|pollution/i, type: 'compliance', subtype: 'puc' },
		{
			pattern: /service|maintenance|repair/i,
			type: 'service',
			subtype: 'service_invoice',
		},
	]

	for (const rule of folderRules) {
		if (rule.pattern.test(folderPath)) {
			candidates.push(
				buildCandidate(`${rule.type}:${rule.subtype}`, 'FOLDER', 0.82),
			)
			break
		}
	}

	const fileRules: Array<{
		pattern: RegExp
		type: VehicleDocumentTypeId
		subtype: string
	}> = [
		{
			pattern: /insurance|policy|renewal/i,
			type: 'insurance',
			subtype: 'motor_policy',
		},
		{
			pattern: /\brc\b|registration\s*certificate/i,
			type: 'registration',
			subtype: 'rc',
		},
		{ pattern: /\bpuc\b|pollution/i, type: 'compliance', subtype: 'puc' },
	]

	for (const rule of fileRules) {
		if (rule.pattern.test(input.fileName)) {
			candidates.push(
				buildCandidate(`${rule.type}:${rule.subtype}`, 'FILENAME', 0.72),
			)
			break
		}
	}

	const resolved = resolveClassificationPrecedence(candidates)
	const [documentTypeRaw, subtypeRaw] = resolved.classification.split(':')
	const documentType = (documentTypeRaw ?? 'other') as VehicleDocumentTypeId

	return {
		...resolved,
		documentType,
		documentSubtype: subtypeRaw ?? 'unknown',
	}
}

export function resolveFinanceDocumentClassification(input: {
	aiDocumentType?: FinanceDocumentType | null
	aiConfidence?: number
	fileName: string
	folderPath?: string | null
	extractedText?: string | null
}): ClassificationDecision & { documentType: FinanceDocumentType } {
	const candidates: ClassificationDecision[] = []

	if (
		input.aiDocumentType &&
		input.aiDocumentType !== 'other' &&
		(input.aiConfidence ?? 0) >= MIN_AI_CLASSIFICATION_CONFIDENCE
	) {
		candidates.push(
			buildCandidate(
				input.aiDocumentType,
				'CONTENT_AI',
				input.aiConfidence ?? 0.7,
			),
		)
	}

	const searchable = `${input.extractedText ?? ''}`.slice(0, 2000).toLowerCase()

	if (
		searchable.includes('home loan') ||
		searchable.includes('loan statement')
	) {
		candidates.push(buildCandidate('loan-statement', 'CONTENT_PARSER', 0.8))
	}

	if (searchable.includes('credit card')) {
		candidates.push(
			buildCandidate('credit-card-statement', 'CONTENT_PARSER', 0.8),
		)
	}

	if (
		searchable.includes('account statement') ||
		searchable.includes('bank statement')
	) {
		candidates.push(buildCandidate('bank-statement', 'CONTENT_PARSER', 0.75))
	}

	const folder = (input.folderPath ?? '').toLowerCase()

	if (/\/loans?\//.test(folder) || /\/home\s*loan\//.test(folder)) {
		candidates.push(buildCandidate('loan-statement', 'FOLDER', 0.75))
	}

	if (/\/credit\s*cards?\//.test(folder)) {
		candidates.push(buildCandidate('credit-card-statement', 'FOLDER', 0.75))
	}

	if (/\/bank\b|\bbank\//.test(folder)) {
		candidates.push(buildCandidate('bank-statement', 'FOLDER', 0.7))
	}

	const fileName = input.fileName.toLowerCase()

	if (/home\s*loan|loan\s*statement/.test(fileName)) {
		candidates.push(buildCandidate('loan-statement', 'FILENAME', 0.72))
	}

	if (/credit\s*card/.test(fileName)) {
		candidates.push(buildCandidate('credit-card-statement', 'FILENAME', 0.72))
	}

	if (/bank\s*statement|account\s*statement/.test(fileName)) {
		candidates.push(buildCandidate('bank-statement', 'FILENAME', 0.72))
	}

	const resolved = resolveClassificationPrecedence(candidates)
	const documentType =
		resolved.classification === 'unknown'
			? 'other'
			: (resolved.classification as FinanceDocumentType)

	return { ...resolved, documentType }
}
