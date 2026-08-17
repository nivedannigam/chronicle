import { supabase } from '@/lib/supabase'
import {
	buildInsuranceMetadataExtraction,
	extractRegistryDocumentForDomain,
} from '@/features/document-import/services/domain-document-extraction.service'
import type {
	InsuranceDocumentKind,
	InsurancePolicyType,
} from '@/features/insurance-knowledge/types/insurance-record.types'
import {
	normalizePolicyNumber,
	policyDedupeKey,
} from '@/features/insurance-knowledge/utils/policy-category-resolver'
import { isPolicyDisplayReady } from '@/features/insurance-knowledge/services/insurance-knowledge-builder'
import type { InsuranceDocumentRecord } from '@/features/insurance-knowledge/types/insurance-record.types'
import { invalidateInsuranceKnowledgeCache } from '@/features/insurance-knowledge/services/insurance-knowledge-cache'

function slugifyInsurer(name: string): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')

	return slug || 'unknown-insurer'
}

function inferDocumentKind(
	fileName: string,
	hint: string | null,
): InsuranceDocumentKind {
	const lower = `${fileName} ${hint ?? ''}`.toLowerCase()

	if (lower.includes('renew')) return 'renewal_notice'
	if (lower.includes('claim')) return 'claim_letter'
	if (lower.includes('receipt') || lower.includes('premium'))
		return 'premium_receipt'

	return 'policy_schedule'
}

function inferPolicyStatus(
	expiryDate: string | null,
): 'active' | 'expired' | 'unknown' {
	if (!expiryDate) return 'unknown'
	return Date.parse(expiryDate) >= Date.now() ? 'active' : 'expired'
}

async function findExistingPolicy(input: {
	userId: string
	insurerId: string
	policyNumber: string
}): Promise<string | null> {
	const normalized = normalizePolicyNumber(input.policyNumber)
	const { data } = await supabase
		.from('insurance_policies')
		.select('id, policy_number, insurer_id')
		.eq('user_id', input.userId)

	for (const row of data ?? []) {
		const key = policyDedupeKey({
			insurerId: row.insurer_id as string,
			policyNumber: row.policy_number as string,
		})
		const candidateKey = policyDedupeKey({
			insurerId: input.insurerId,
			policyNumber: normalized,
		})

		if (key === candidateKey) {
			return row.id as string
		}
	}

	return null
}

export async function processInsuranceDocument(input: {
	userId: string
	documentId: string
	fileName: string
	familyMemberId: string | null
	categoryHint?: string | null
	folderPath?: string | null
	registryId?: string | null
	externalFileId?: string | null
	storagePath?: string | null
}): Promise<{ policyId: string | null }> {
	const now = new Date().toISOString()
	let extractionResult = null
	let storagePath = input.storagePath ?? null

	if (input.registryId && input.externalFileId) {
		const { download, extraction } = await extractRegistryDocumentForDomain({
			target: 'insurance',
			userId: input.userId,
			registryId: input.registryId,
			externalFileId: input.externalFileId,
			fileName: input.fileName,
			folderPath: input.folderPath,
			documentId: input.documentId,
			categoryHint: input.categoryHint ?? null,
			storagePath: input.storagePath ?? null,
		})

		extractionResult = extraction
		storagePath = download?.storagePath ?? storagePath
	} else {
		extractionResult = buildInsuranceMetadataExtraction({
			fileName: input.fileName,
			categoryHint: input.categoryHint ?? null,
		})
	}

	const extracted = extractionResult.insurance
	const insurerName = extracted?.insurer?.trim() || 'Unknown insurer'
	const insurerId = slugifyInsurer(insurerName)
	const policyNumber =
		extracted?.policyNumber?.trim() ||
		normalizePolicyNumber(input.fileName.replace(/\.[^.]+$/, ''))
	const policyType =
		extracted?.policyType ?? inferPolicyType(input.categoryHint ?? null)
	const productName =
		extracted?.productName?.trim() || input.fileName.replace(/\.[^.]+$/, '')
	const extractionMethod =
		extractionResult.method === 'llm' ? 'llm' : 'deterministic'
	const confidence = extracted?.confidence ?? 0.35

	let policyId = await findExistingPolicy({
		userId: input.userId,
		insurerId,
		policyNumber,
	})

	if (!policyId) {
		const { data: policy, error: policyError } = await supabase
			.from('insurance_policies')
			.insert({
				user_id: input.userId,
				family_member_id: input.familyMemberId,
				policy_number: normalizePolicyNumber(policyNumber),
				policy_type: policyType,
				product_name: productName,
				insurer_id: insurerId,
				status: inferPolicyStatus(extracted?.expiryDate ?? null),
				inception_date: extracted?.inceptionDate ?? null,
				expiry_date: extracted?.expiryDate ?? null,
				renewal_date: extracted?.renewalDate ?? extracted?.expiryDate ?? null,
				sum_insured: extracted?.sumInsured,
				currency: extracted?.currency ?? 'INR',
				source_document_ids: [input.documentId],
				extraction_method: extractionMethod,
				confidence,
				updated_at: now,
			})
			.select('id')
			.single()

		if (policyError) {
			throw new Error(policyError.message)
		}

		policyId = policy.id as string
	} else {
		const { data: existing } = await supabase
			.from('insurance_policies')
			.select('source_document_ids, sum_insured, expiry_date')
			.eq('id', policyId)
			.single()

		const sourceDocumentIds = Array.from(
			new Set([...(existing?.source_document_ids ?? []), input.documentId]),
		)

		await supabase
			.from('insurance_policies')
			.update({
				policy_type: policyType,
				product_name: productName,
				insurer_id: insurerId,
				status: inferPolicyStatus(
					extracted?.expiryDate ?? existing?.expiry_date ?? null,
				),
				inception_date: extracted?.inceptionDate ?? null,
				expiry_date: extracted?.expiryDate ?? existing?.expiry_date ?? null,
				renewal_date: extracted?.renewalDate ?? extracted?.expiryDate ?? null,
				sum_insured: extracted?.sumInsured ?? existing?.sum_insured ?? null,
				source_document_ids: sourceDocumentIds,
				extraction_method: extractionMethod,
				confidence,
				updated_at: now,
			})
			.eq('id', policyId)
	}

	const documentKind =
		(extracted?.documentKind as InsuranceDocumentKind | null) ??
		inferDocumentKind(input.fileName, input.categoryHint ?? null)

	const { error: documentError } = await supabase
		.from('insurance_documents')
		.update({
			status: 'completed',
			storage_path: storagePath,
			document_kind: documentKind,
			processed_at: now,
			parsed_data: {
				policyId,
				extraction: extractionResult,
				insurerName,
				policyNumber: normalizePolicyNumber(policyNumber),
				extractedText: extractionResult.extractedText,
			},
			updated_at: now,
		})
		.eq('id', input.documentId)

	if (documentError) {
		throw new Error(documentError.message)
	}

	return { policyId: policyId ?? null }
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
			document_kind: inferDocumentKind(input.fileName, null),
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

export function insuranceDocumentNeedsReprocess(input: {
	document: Pick<InsuranceDocumentRecord, 'status' | 'parsedData'>
	policy: {
		extractionMethod: string
		confidence: number
		insurerId: string
		policyNumber: string
		sumInsured: number | null
		expiryDate: string | null
	} | null
}): boolean {
	if (input.document.status === 'failed') {
		return true
	}

	if (!input.policy) {
		return true
	}

	return !isPolicyDisplayReady({
		id: 'policy',
		userId: 'user',
		familyMemberId: null,
		policyNumber: input.policy.policyNumber,
		policyType: 'other',
		productName: null,
		insurerId: input.policy.insurerId,
		status: 'unknown',
		inceptionDate: null,
		expiryDate: input.policy.expiryDate,
		renewalDate: null,
		sumInsured: input.policy.sumInsured,
		currency: 'INR',
		sourceDocumentIds: [],
		extractionMethod: input.policy
			.extractionMethod as import('@/features/insurance-knowledge/types/insurance-record.types').InsuranceExtractionMethod,
		confidence: input.policy.confidence,
		createdAt: '',
		updatedAt: '',
	})
}

export async function reprocessStuckInsuranceDocuments(
	userId: string,
): Promise<{ processed: number; failed: number; succeeded: number }> {
	const [
		{ data: documents, error: documentsError },
		{ data: policies, error: policiesError },
	] = await Promise.all([
		supabase
			.from('insurance_documents')
			.select(
				'id, file_name, storage_path, registry_id, family_member_id, parsed_data, status',
			)
			.eq('user_id', userId),
		supabase
			.from('insurance_policies')
			.select(
				'id, policy_number, insurer_id, sum_insured, expiry_date, extraction_method, confidence, source_document_ids',
			)
			.eq('user_id', userId),
	])

	if (documentsError) {
		throw new Error(documentsError.message)
	}

	if (policiesError) {
		throw new Error(policiesError.message)
	}

	const registryRows =
		(
			await supabase
				.from('connector_document_registry')
				.select('id, external_file_id, folder_path')
				.eq('user_id', userId)
		).data ?? []

	const registryById = new Map(
		registryRows.map((row) => [
			row.id as string,
			row as Record<string, unknown>,
		]),
	)

	let processed = 0
	let failed = 0
	let succeeded = 0

	for (const row of documents ?? []) {
		const documentId = row.id as string
		const parsedData =
			(row.parsed_data as Record<string, unknown> | null) ?? null
		const policyId =
			typeof parsedData?.policyId === 'string' ? parsedData.policyId : null
		const policyRow =
			(policies ?? []).find((entry) => entry.id === policyId) ??
			(policies ?? []).find((entry) =>
				((entry.source_document_ids as string[] | null) ?? []).includes(
					documentId,
				),
			) ??
			null

		if (
			!insuranceDocumentNeedsReprocess({
				document: {
					status: row.status as string,
					parsedData,
				},
				policy: policyRow
					? {
							policyNumber: policyRow.policy_number as string,
							insurerId: (policyRow.insurer_id as string) ?? 'unknown-insurer',
							sumInsured:
								policyRow.sum_insured != null
									? Number(policyRow.sum_insured)
									: null,
							expiryDate: (policyRow.expiry_date as string | null) ?? null,
							extractionMethod: policyRow.extraction_method as string,
							confidence: Number(policyRow.confidence ?? 0),
						}
					: null,
			})
		) {
			continue
		}

		const registryId = row.registry_id as string | null
		const registry = registryId ? registryById.get(registryId) : null

		if (!registry?.external_file_id) {
			continue
		}

		processed += 1

		try {
			await processInsuranceDocument({
				userId,
				documentId,
				fileName: row.file_name as string,
				familyMemberId: (row.family_member_id as string | null) ?? null,
				folderPath: (registry.folder_path as string | null) ?? null,
				registryId,
				externalFileId: registry.external_file_id as string,
				storagePath: (row.storage_path as string | null) ?? null,
			})
			succeeded += 1
		} catch {
			failed += 1
		}
	}

	if (processed > 0) {
		invalidateInsuranceKnowledgeCache(userId)
	}

	return { processed, failed, succeeded }
}
