import { updateDocumentRecord } from '@/features/documents/services/document.service'
import { extractRegistryDocumentForDomain } from '@/features/document-import/services/domain-document-extraction.service'
import { buildFinanceDocumentDisplayLabel } from '@/features/finance-knowledge/services/finance-document-display.service'
import { buildFinanceExtractionPayloadFromAi } from '@/features/finance-knowledge/services/derive-finance-records-from-documents.service'
import {
	FINANCE_EXTRACTABLE_TYPES,
	type FinanceDocumentExtractionPayload,
	type FinancialFactRecord,
} from '@/features/finance-knowledge/types/finance-extraction.types'
import {
	isAiStructuredExtractionMethod,
	type DocumentExtractionMethod,
} from '@/shared/ai/types/document-extraction.types'
import type { FinanceDocumentAiExtraction } from '@/shared/ai/types/domain-document-extraction.types'

const EXTRACTION_FAILURE_MESSAGE =
	"We couldn't read the financial details from this document yet."

function readExistingPayload(
	metadata: Record<string, unknown>,
): FinanceDocumentExtractionPayload | null {
	const payload = metadata.financeExtraction
	return payload && typeof payload === 'object'
		? (payload as FinanceDocumentExtractionPayload)
		: null
}

function isExtractableDocumentType(
	subCategoryId: string | null | undefined,
): subCategoryId is (typeof FINANCE_EXTRACTABLE_TYPES)[number] {
	return (
		subCategoryId != null &&
		FINANCE_EXTRACTABLE_TYPES.includes(
			subCategoryId as (typeof FINANCE_EXTRACTABLE_TYPES)[number],
		)
	)
}

function buildUnsupportedPayload(input: {
	documentType: string
}): FinanceDocumentExtractionPayload {
	return {
		status: 'unsupported',
		documentType:
			input.documentType as FinanceDocumentExtractionPayload['documentType'],
		entityKind: null,
		entityId: null,
		institutionName: null,
		maskedIdentifier: null,
		displayName: null,
		accountType: null,
		cardName: null,
		loanType: null,
		schemeName: null,
		statementDate: null,
		statementPeriodStart: null,
		statementPeriodEnd: null,
		facts: [],
		ownership: 'unknown',
		accountHolder: null,
		jointHolder: null,
		extractionMethod: null,
		extractedAt: new Date().toISOString(),
		userMessage: null,
	}
}

function buildFailedPayload(input: {
	documentType: string
	existingFacts?: FinancialFactRecord[]
}): FinanceDocumentExtractionPayload {
	return {
		status: 'failed',
		documentType:
			input.documentType as FinanceDocumentExtractionPayload['documentType'],
		entityKind: null,
		entityId: null,
		institutionName: null,
		maskedIdentifier: null,
		displayName: null,
		accountType: null,
		cardName: null,
		loanType: null,
		schemeName: null,
		statementDate: null,
		statementPeriodStart: null,
		statementPeriodEnd: null,
		facts: input.existingFacts ?? [],
		ownership: 'unknown',
		accountHolder: null,
		jointHolder: null,
		extractionMethod: null,
		extractedAt: new Date().toISOString(),
		userMessage: EXTRACTION_FAILURE_MESSAGE,
	}
}

export function shouldProcessFinanceDocument(input: {
	subCategoryId: string | null | undefined
	extractedMetadata?: Record<string, unknown>
}): boolean {
	if (!isExtractableDocumentType(input.subCategoryId)) {
		return false
	}

	const payload = readExistingPayload(input.extractedMetadata ?? {})
	if (!payload) {
		return true
	}

	return (
		payload.status === 'pending' ||
		payload.status === 'incomplete' ||
		payload.status === 'failed'
	)
}

export async function processFinanceDocument(input: {
	userId: string
	documentId: string
	fileName: string
	folderPath?: string | null
	subCategoryId?: string | null
	registryId?: string | null
	externalFileId?: string | null
	storagePath?: string | null
	extractedMetadata?: Record<string, unknown>
}): Promise<{ processed: boolean }> {
	const documentType = input.subCategoryId ?? 'other'

	if (!isExtractableDocumentType(input.subCategoryId)) {
		const payload = buildUnsupportedPayload({ documentType })
		await updateDocumentRecord(input.documentId, {
			status: 'active',
			extracted_metadata: {
				...(input.extractedMetadata ?? {}),
				financeExtraction: payload,
			},
		})
		return { processed: false }
	}

	const existingPayload = readExistingPayload(input.extractedMetadata ?? {})
	const existingFacts = existingPayload?.facts ?? []
	const fallbackLabel = buildFinanceDocumentDisplayLabel({
		fileName: input.fileName,
		folderPath: input.folderPath,
		classificationType: input.subCategoryId,
	})

	await updateDocumentRecord(input.documentId, {
		status: 'processing',
	})

	try {
		let financeExtraction: FinanceDocumentAiExtraction | null = null
		let extractionMethod = 'deterministic_fallback'
		let extractedText: string | null = null

		if (input.registryId && input.externalFileId) {
			const { extraction } = await extractRegistryDocumentForDomain({
				target: 'finance',
				userId: input.userId,
				registryId: input.registryId,
				externalFileId: input.externalFileId,
				fileName: input.fileName,
				folderPath: input.folderPath,
				documentId: input.documentId,
				categoryHint: input.subCategoryId,
				storagePath: input.storagePath ?? null,
			})

			financeExtraction = extraction.finance ?? null
			extractionMethod = extraction.method
			extractedText = extraction.extractedText
		}

		if (
			!financeExtraction ||
			!isAiStructuredExtractionMethod(
				extractionMethod as DocumentExtractionMethod,
			) ||
			financeExtraction.confidence < 0.35
		) {
			const payload = buildFailedPayload({
				documentType,
				existingFacts,
			})

			await updateDocumentRecord(input.documentId, {
				status: 'active',
				extracted_metadata: {
					...(input.extractedMetadata ?? {}),
					folderPath: input.folderPath ?? null,
					financeExtraction: payload,
				},
				knowledge_refs: [
					{
						domain: 'finance',
						entityId: input.documentId,
						label: fallbackLabel,
					},
				],
			})

			return { processed: true }
		}

		const payload = buildFinanceExtractionPayloadFromAi({
			documentId: input.documentId,
			documentType,
			extraction: financeExtraction,
			extractionMethod,
			fallbackLabel,
			existingFacts,
		})

		await updateDocumentRecord(input.documentId, {
			status: 'active',
			extracted_text: extractedText,
			extracted_metadata: {
				...(input.extractedMetadata ?? {}),
				folderPath: input.folderPath ?? null,
				financeExtraction: payload,
				financeDisplayLabel: payload.displayName ?? fallbackLabel,
			},
			knowledge_refs: [
				{
					domain: 'finance',
					entityId: payload.entityId ?? input.documentId,
					label: payload.displayName ?? fallbackLabel,
				},
			],
		})

		return { processed: true }
	} catch {
		const payload = buildFailedPayload({ documentType, existingFacts })

		await updateDocumentRecord(input.documentId, {
			status: 'active',
			extracted_metadata: {
				...(input.extractedMetadata ?? {}),
				folderPath: input.folderPath ?? null,
				financeExtraction: payload,
			},
			knowledge_refs: [
				{
					domain: 'finance',
					entityId: input.documentId,
					label: fallbackLabel,
				},
			],
		})

		return { processed: true }
	}
}

export async function processPendingFinanceDocuments(input: {
	userId: string
	documents: Array<{
		id: string
		file_name: string
		sub_category_id: string | null
		extracted_metadata: Record<string, unknown>
		external_file_id: string | null
		connector_registry_id: string | null
		storage_path: string
	}>
}): Promise<number> {
	let processed = 0

	for (const document of input.documents) {
		if (
			!shouldProcessFinanceDocument({
				subCategoryId: document.sub_category_id,
				extractedMetadata: document.extracted_metadata,
			})
		) {
			continue
		}

		const folderPath =
			typeof document.extracted_metadata.folderPath === 'string'
				? document.extracted_metadata.folderPath
				: null

		await processFinanceDocument({
			userId: input.userId,
			documentId: document.id,
			fileName: document.file_name,
			folderPath,
			subCategoryId: document.sub_category_id,
			registryId: document.connector_registry_id,
			externalFileId: document.external_file_id,
			storagePath: document.storage_path,
			extractedMetadata: document.extracted_metadata,
		})

		processed += 1
	}

	return processed
}
