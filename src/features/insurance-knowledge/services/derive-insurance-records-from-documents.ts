import type { InsuranceDocumentExtraction } from '@/shared/ai/types/domain-document-extraction.types'
import type {
	InsuranceDocumentRecord,
	InsuranceInsurerRecord,
	InsuranceMemberRecord,
	InsurancePolicyRecord,
	InsurancePremiumRecord,
	InsuranceRenewalRecord,
} from '@/features/insurance-knowledge/types/insurance-record.types'

interface ParsedInsuranceDocumentData {
	policyId?: string
	insurerName?: string
	policyNumber?: string
	extraction?: {
		method?: string
		insurance?: InsuranceDocumentExtraction | null
	}
}

function readParsedDocument(
	document: InsuranceDocumentRecord,
): ParsedInsuranceDocumentData | null {
	if (!document.parsedData || typeof document.parsedData !== 'object') {
		return null
	}

	return document.parsedData as ParsedInsuranceDocumentData
}

function readExtraction(
	document: InsuranceDocumentRecord,
): InsuranceDocumentExtraction | null {
	const parsed = readParsedDocument(document)
	return parsed?.extraction?.insurance ?? null
}

function resolvePolicyId(
	document: InsuranceDocumentRecord,
	policies: InsurancePolicyRecord[],
): string | null {
	const parsed = readParsedDocument(document)
	if (parsed?.policyId) {
		return parsed.policyId
	}

	if (parsed?.policyNumber) {
		const normalized = parsed.policyNumber.trim().toUpperCase()
		const match = policies.find(
			(policy) => policy.policyNumber.trim().toUpperCase() === normalized,
		)
		if (match) {
			return match.id
		}
	}

	return (
		policies.find((policy) => policy.sourceDocumentIds.includes(document.id))
			?.id ?? null
	)
}

export function deriveInsuranceRecordsFromDocuments(input: {
	policies: InsurancePolicyRecord[]
	documents: InsuranceDocumentRecord[]
}): {
	premiums: InsurancePremiumRecord[]
	members: InsuranceMemberRecord[]
	renewals: InsuranceRenewalRecord[]
	insurers: InsuranceInsurerRecord[]
	documents: InsuranceDocumentRecord[]
} {
	const premiums: InsurancePremiumRecord[] = []
	const members: InsuranceMemberRecord[] = []
	const renewals: InsuranceRenewalRecord[] = []
	const insurers = new Map<string, InsuranceInsurerRecord>()

	for (const policy of input.policies) {
		if (!policy.insurerId || policy.insurerId === 'unknown-insurer') {
			continue
		}

		insurers.set(policy.insurerId, {
			id: policy.insurerId,
			canonicalName: policy.insurerId,
			displayName: policy.insurerId.replace(/-/g, ' '),
			country: 'IN',
		})
	}

	const documents = input.documents.map((document) => {
		const policyId = resolvePolicyId(document, input.policies)
		const extraction = readExtraction(document)
		const parsed = readParsedDocument(document)

		if (parsed?.insurerName && policyId) {
			const policy = input.policies.find((entry) => entry.id === policyId)
			if (policy?.insurerId) {
				insurers.set(policy.insurerId, {
					id: policy.insurerId,
					canonicalName: policy.insurerId,
					displayName: parsed.insurerName,
					country: 'IN',
				})
			}
		}

		if (policyId && extraction?.premium != null) {
			premiums.push({
				id: `${document.id}:premium`,
				policyId,
				amount: extraction.premium,
				currency: extraction.currency ?? 'INR',
				frequency:
					document.documentKind === 'premium_receipt' ? 'annual' : 'unknown',
				dueDate: extraction.renewalDate ?? extraction.expiryDate ?? null,
				paidDate:
					document.documentKind === 'premium_receipt'
						? (document.processedAt?.slice(0, 10) ?? null)
						: null,
				sourceDocumentId: document.id,
			})
		}

		if (policyId && extraction?.insuredMembers?.length) {
			for (const [index, name] of extraction.insuredMembers.entries()) {
				members.push({
					id: `${document.id}:member:${index}`,
					policyId,
					name,
					relationship: 'insured',
					dateOfBirth: null,
					familyMemberId: document.familyMemberId,
				})
			}
		}

		if (policyId) {
			const policy = input.policies.find((entry) => entry.id === policyId)
			const renewalDate =
				extraction?.renewalDate ??
				extraction?.expiryDate ??
				policy?.renewalDate ??
				policy?.expiryDate ??
				null

			if (renewalDate) {
				renewals.push({
					id: `${document.id}:renewal`,
					policyId,
					renewalDate,
					previousPremium: null,
					newPremium: extraction?.premium ?? null,
					status: 'upcoming',
					sourceDocumentId: document.id,
				})
			}
		}

		return {
			...document,
			linkedPolicyIds: policyId ? [policyId] : document.linkedPolicyIds,
		}
	})

	return {
		premiums,
		members,
		renewals,
		insurers: [...insurers.values()],
		documents,
	}
}
