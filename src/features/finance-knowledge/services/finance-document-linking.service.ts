import type { DocumentKnowledgeRef } from '@/features/documents/types/document.types'
import {
	buildFinanceDocumentDisplayLabel,
	buildFinanceLibraryTitle,
} from '@/features/finance-knowledge/services/finance-document-display.service'
import { classifyFinanceDocument } from '@/features/finance-knowledge/services/finance-document-classifier.service'
import type {
	FinanceClassificationMetadata,
	FinanceDocumentClassification,
} from '@/features/finance-knowledge/types/finance-classification.types'

export interface FinanceDocumentLinkResult {
	subCategoryId: string
	title: string
	displayLabel: string
	classification: FinanceDocumentClassification
	knowledgeRefs: DocumentKnowledgeRef[]
	extractedMetadata: Record<string, unknown>
}

export function buildFinanceDocumentLink(input: {
	documentId: string
	fileName: string
	folderPath?: string | null
	mimeType?: string | null
	subCategoryId?: string | null
	extractedMetadata?: Record<string, unknown> | null
	extractedText?: string | null
}): FinanceDocumentLinkResult {
	const classification = classifyFinanceDocument({
		fileName: input.fileName,
		folderPath: input.folderPath,
		mimeType: input.mimeType,
		subCategoryId: input.subCategoryId,
		extractedMetadata: input.extractedMetadata,
		extractedText: input.extractedText,
	})

	const displayLabel = buildFinanceDocumentDisplayLabel({
		fileName: input.fileName,
		folderPath: input.folderPath,
		classificationType: classification.type,
	})

	const title = buildFinanceLibraryTitle({ displayLabel })
	const classificationMetadata: FinanceClassificationMetadata = {
		financeClassification: classification,
		financeDisplayLabel: displayLabel,
		classifiedAt: new Date().toISOString(),
	}

	return {
		subCategoryId: classification.type,
		title,
		displayLabel,
		classification,
		knowledgeRefs: [
			{
				domain: 'finance',
				entityId: input.documentId,
				label: displayLabel,
			},
		],
		extractedMetadata: {
			...(input.extractedMetadata ?? {}),
			...(input.folderPath ? { folderPath: input.folderPath } : {}),
			...classificationMetadata,
		},
	}
}
