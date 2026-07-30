import { runDocumentIntelligencePipeline } from '@/features/document-intelligence/pipeline/document-intelligence.pipeline'
import type { PassportDocument } from '@/features/documents/domain/passport.domain'
import type { HealthReport } from '@/features/health/domain/health-report.domain'
import { applyExtractedTextToDocument } from '@/features/documents/services/document-upload.service'
import { buildDocumentTitle } from '@/features/documents/extraction/document-metadata.engine'
import { updateDocumentRecord } from '@/features/documents/services/document.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { transitionDocumentWorkflow } from '@/features/documents/workflow/documents-workflow.service'
import type { ParsedDocument } from '@chronicle/core-parser'

export interface ProcessChronicleDocumentResult {
	document: ChronicleDocument
	parsedDocument: ParsedDocument<unknown>
	passport?: PassportDocument
	healthReport?: HealthReport
}

function isPassportPayload(payload: unknown): payload is PassportDocument {
	return (
		typeof payload === 'object' &&
		payload != null &&
		'documentNumber' in payload &&
		'extractedText' in payload
	)
}

function isHealthReportPayload(payload: unknown): payload is HealthReport {
	return (
		typeof payload === 'object' &&
		payload != null &&
		'metrics' in payload &&
		'metadata' in payload
	)
}

export async function processChronicleDocument(
	document: ChronicleDocument,
): Promise<ProcessChronicleDocumentResult> {
	await transitionDocumentWorkflow(document.id, 'processing', 'OCR started')

	try {
		const outcome = await runDocumentIntelligencePipeline({
			document: {
				id: document.id,
				userId: document.user_id,
				fileName: document.file_name,
				storagePath: document.storage_path,
				mimeType: document.mime_type,
				uploadedAt: document.uploaded_at,
			},
		})

		if (outcome.stage === 'failed') {
			await transitionDocumentWorkflow(document.id, 'failed', outcome.error)
			throw new Error(outcome.error)
		}

		const { parsedDocument } = outcome
		let updated = await applyExtractedTextToDocument({
			documentId: document.id,
			extractedText: outcome.extractedText,
		})

		if (
			parsedDocument.documentType === 'passport' &&
			isPassportPayload(parsedDocument.payload)
		) {
			const passport = parsedDocument.payload
			const title = buildDocumentTitle({
				fileName: document.file_name,
				categoryId: 'identity',
				subCategoryId: 'passport',
				documentNumber: passport.documentNumber,
			})

			updated = await updateDocumentRecord(document.id, {
				title,
				category_id: 'identity',
				sub_category_id: 'passport',
				document_number: passport.documentNumber,
				issue_date: passport.issueDate,
				expiry_date: passport.expiryDate,
				issuer: passport.issuer,
				extracted_metadata: {
					...updated.extracted_metadata,
					parserId: parsedDocument.parserId,
					parserVersion: parsedDocument.parserVersion,
					holderName: passport.holderName,
					nationality: passport.nationality,
					mrzLine1: passport.mrzLine1,
					mrzLine2: passport.mrzLine2,
				},
				status: 'active',
			})

			return {
				document: updated,
				parsedDocument,
				passport,
			}
		}

		if (
			parsedDocument.documentType === 'health_report' &&
			isHealthReportPayload(parsedDocument.payload)
		) {
			updated = await transitionDocumentWorkflow(
				document.id,
				'active',
				'Health report parsed',
			)

			return {
				document: updated,
				parsedDocument,
				healthReport: parsedDocument.payload,
			}
		}

		updated = await transitionDocumentWorkflow(
			document.id,
			'active',
			'Document indexed',
		)

		return {
			document: updated,
			parsedDocument,
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Document processing failed'

		await transitionDocumentWorkflow(document.id, 'failed', message)
		throw error
	}
}
