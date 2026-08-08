import { supabase } from '@/lib/supabase'
import type {
	InsuranceDocumentKind,
	InsurancePolicyType,
} from '@/features/insurance-knowledge/types/insurance-record.types'

function slugFromFileName(fileName: string): string {
	return fileName
		.replace(/\.[^.]+$/, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toUpperCase()
		.slice(0, 32)
}

function inferPolicyType(categoryHint: string | null): InsurancePolicyType {
	switch (categoryHint) {
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
			return 'other'
	}
}

function inferDocumentKind(fileName: string): InsuranceDocumentKind {
	const lower = fileName.toLowerCase()

	if (lower.includes('renew')) {
		return 'renewal_notice'
	}

	if (lower.includes('claim')) {
		return 'claim_letter'
	}

	if (lower.includes('receipt') || lower.includes('premium')) {
		return 'premium_receipt'
	}

	return 'policy_schedule'
}

export async function processInsuranceDocument(input: {
	userId: string
	documentId: string
	fileName: string
	familyMemberId: string | null
	categoryHint?: string | null
}): Promise<{ policyId: string | null }> {
	const now = new Date().toISOString()
	const policyNumber =
		slugFromFileName(input.fileName) || input.documentId.slice(0, 8)
	const policyType = inferPolicyType(input.categoryHint ?? null)
	const productName = input.fileName.replace(/\.[^.]+$/, '')

	const { data: existingPolicy } = await supabase
		.from('insurance_policies')
		.select('id')
		.eq('user_id', input.userId)
		.eq('policy_number', policyNumber)
		.maybeSingle()

	let policyId = existingPolicy?.id as string | undefined

	if (!policyId) {
		const { data: policy, error: policyError } = await supabase
			.from('insurance_policies')
			.insert({
				user_id: input.userId,
				family_member_id: input.familyMemberId,
				policy_number: policyNumber,
				policy_type: policyType,
				product_name: productName,
				insurer_id: 'unknown-insurer',
				status: 'active',
				sum_insured: 0,
				currency: 'INR',
				source_document_ids: [input.documentId],
				extraction_method: 'deterministic',
				confidence: 0.55,
				updated_at: now,
			})
			.select('id')
			.single()

		if (policyError) {
			throw new Error(policyError.message)
		}

		policyId = policy.id as string
	}

	const { error: documentError } = await supabase
		.from('insurance_documents')
		.update({
			status: 'completed',
			document_kind: inferDocumentKind(input.fileName),
			processed_at: now,
			parsed_data: {
				policyId,
				policyNumber,
				policyType,
				productName,
			},
			updated_at: now,
		})
		.eq('id', input.documentId)

	if (documentError) {
		throw new Error(documentError.message)
	}

	return { policyId: policyId ?? null }
}

export async function createInsuranceDocumentFromRegistry(input: {
	userId: string
	registryId: string
	fileName: string
	familyMemberId: string | null
	folderAssignmentId: string | null
}): Promise<string> {
	const now = new Date().toISOString()

	const { data, error } = await supabase
		.from('insurance_documents')
		.insert({
			user_id: input.userId,
			family_member_id: input.familyMemberId,
			folder_assignment_id: input.folderAssignmentId,
			registry_id: input.registryId,
			file_name: input.fileName,
			document_kind: inferDocumentKind(input.fileName),
			status: 'processing',
			uploaded_at: now,
			updated_at: now,
		})
		.select('id')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return data.id as string
}
