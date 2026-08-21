import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import type { ConnectorDocumentRecord } from '@/core/connectors'
import { isInsuranceRegistryRow } from '@/features/connectors/services/registry-module-routing.service'
import { resolveInsuranceCategoryHint } from '@/features/insurance/services/insurance-folder-discovery.service'

export type InsuranceMaterializationAction =
	'import_and_process' | 'reprocess_stuck' | 'skip_existing' | 'needs_review'

export interface InsuranceMaterializationPlanRow {
	registryId: string
	fileName: string
	folderPath: string | null
	categoryHint: PolicyCategoryId | null
	action: InsuranceMaterializationAction
	reason: string
	hasInsuranceDocument: boolean
	documentStatus: string | null
}

export function isLikelyNonPolicyInsuranceDocument(fileName: string): boolean {
	const lower = fileName.toLowerCase()

	return (
		/\bfaq\b/.test(lower) ||
		/\bbrochure\b/.test(lower) ||
		/\bguide\b/.test(lower) ||
		/\binformation sheet\b/.test(lower) ||
		/\bproduct information\b/.test(lower)
	)
}

export function resolveInsuranceMaterializationAction(input: {
	registryRow: Pick<
		ConnectorDocumentRecord,
		'id' | 'fileName' | 'folderPath' | 'insuranceDocumentId' | 'importStatus'
	>
	documentStatus?: string | null
	categoryHint?: PolicyCategoryId | null
}): InsuranceMaterializationPlanRow {
	const categoryHint =
		input.categoryHint ??
		resolveInsuranceCategoryHint({
			folderPath: input.registryRow.folderPath,
			fileName: input.registryRow.fileName,
		})

	if (isLikelyNonPolicyInsuranceDocument(input.registryRow.fileName)) {
		if (!input.registryRow.insuranceDocumentId) {
			return {
				registryId: input.registryRow.id,
				fileName: input.registryRow.fileName,
				folderPath: input.registryRow.folderPath,
				categoryHint,
				action: 'import_and_process',
				reason: 'Informational document — import and flag for review.',
				hasInsuranceDocument: false,
				documentStatus: null,
			}
		}

		return {
			registryId: input.registryRow.id,
			fileName: input.registryRow.fileName,
			folderPath: input.registryRow.folderPath,
			categoryHint,
			action: 'needs_review',
			reason: 'Document appears informational rather than a policy PDF.',
			hasInsuranceDocument: true,
			documentStatus: input.documentStatus ?? null,
		}
	}

	if (input.registryRow.insuranceDocumentId) {
		if (
			input.documentStatus === 'processing' ||
			input.documentStatus === 'failed' ||
			input.documentStatus === 'uploaded'
		) {
			return {
				registryId: input.registryRow.id,
				fileName: input.registryRow.fileName,
				folderPath: input.registryRow.folderPath,
				categoryHint,
				action: 'reprocess_stuck',
				reason: `Existing insurance document is ${input.documentStatus}.`,
				hasInsuranceDocument: true,
				documentStatus: input.documentStatus ?? null,
			}
		}

		return {
			registryId: input.registryRow.id,
			fileName: input.registryRow.fileName,
			folderPath: input.registryRow.folderPath,
			categoryHint,
			action: 'skip_existing',
			reason: 'Already materialized.',
			hasInsuranceDocument: true,
			documentStatus: input.documentStatus ?? null,
		}
	}

	return {
		registryId: input.registryRow.id,
		fileName: input.registryRow.fileName,
		folderPath: input.registryRow.folderPath,
		categoryHint,
		action: 'import_and_process',
		reason: 'Pending insurance registry import.',
		hasInsuranceDocument: false,
		documentStatus: null,
	}
}

export function buildInsuranceMaterializationPlan(input: {
	registryRows: ConnectorDocumentRecord[]
	documentsById: Map<string, { status: string }>
}): InsuranceMaterializationPlanRow[] {
	return input.registryRows
		.filter((row) => isInsuranceRegistryRow(row))
		.map((row) =>
			resolveInsuranceMaterializationAction({
				registryRow: row,
				documentStatus: row.insuranceDocumentId
					? (input.documentsById.get(row.insuranceDocumentId)?.status ?? null)
					: null,
			}),
		)
		.sort((left, right) => left.fileName.localeCompare(right.fileName))
}

export function summarizeMaterializationPlan(
	rows: InsuranceMaterializationPlanRow[],
) {
	return rows.reduce(
		(summary, row) => {
			summary[row.action] = (summary[row.action] ?? 0) + 1

			if (row.categoryHint) {
				summary.categories[row.categoryHint] =
					(summary.categories[row.categoryHint] ?? 0) + 1
			}

			return summary
		},
		{
			import_and_process: 0,
			reprocess_stuck: 0,
			skip_existing: 0,
			needs_review: 0,
			categories: {} as Record<string, number>,
		},
	)
}
