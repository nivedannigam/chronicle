import { buildPropertyKnowledge } from '@/features/property-knowledge/services/property-knowledge.builder'
import type { PropertyKnowledge } from '@/features/property-knowledge/types/property-knowledge.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

export interface PropertyIntegrityAuditResult {
	generatedAt: string
	summary: {
		documentsDiscovered: number
		documentsClassified: number
		documentsOther: number
		propertiesCreated: number
		propertiesAmbiguous: number
		duplicatePropertyCandidates: number
		timelineEvents: number
		attentionItems: number
		financeReferenceOnlyLinks: number
		insuranceReferenceOnlyLinks: number
	}
	findings: {
		duplicateProperties: string[]
		unresolvedOwnership: string[]
		missingPrimaryDocuments: string[]
		financeEntityLeakage: string[]
	}
}

function countReferenceLinks(knowledge: PropertyKnowledge): {
	finance: number
	insurance: number
} {
	let finance = 0
	let insurance = 0

	for (const property of knowledge.properties) {
		for (const reference of property.references) {
			if (reference.kind === 'finance_loan') {
				finance += 1
			}
			if (reference.kind === 'insurance_policy') {
				insurance += 1
			}
		}
	}

	return { finance, insurance }
}

export function runPropertyIntegrityAudit(input: {
	userId: string
	documents: ChronicleDocument[]
	hasFolderAssigned?: boolean
	rootFolderPath?: string | null
}): PropertyIntegrityAuditResult {
	const knowledge = buildPropertyKnowledge({
		userId: input.userId,
		documents: input.documents,
		members: [],
		hasFolderAssigned: input.hasFolderAssigned ?? true,
		rootFolderPath: input.rootFolderPath ?? 'Home',
	})

	const slugCounts = new Map<string, number>()

	for (const property of knowledge.properties) {
		slugCounts.set(property.slug, (slugCounts.get(property.slug) ?? 0) + 1)
	}

	const duplicateProperties = [...slugCounts.entries()]
		.filter(([, count]) => count > 1)
		.map(([slug]) => slug)

	const references = countReferenceLinks(knowledge)

	return {
		generatedAt: new Date().toISOString(),
		summary: {
			documentsDiscovered: input.documents.filter(
				(document) => document.category_id === 'property',
			).length,
			documentsClassified: knowledge.documents.filter(
				(document) => document.typeId !== 'other',
			).length,
			documentsOther: knowledge.documents.filter(
				(document) => document.typeId === 'other',
			).length,
			propertiesCreated: knowledge.properties.length,
			propertiesAmbiguous: knowledge.properties.filter(
				(property) => property.resolutionState === 'ambiguous',
			).length,
			duplicatePropertyCandidates: duplicateProperties.length,
			timelineEvents: knowledge.timeline.length,
			attentionItems: knowledge.attention.length,
			financeReferenceOnlyLinks: references.finance,
			insuranceReferenceOnlyLinks: references.insurance,
		},
		findings: {
			duplicateProperties,
			unresolvedOwnership: knowledge.properties
				.filter((property) => property.ownership === 'unknown')
				.map((property) => property.displayName),
			missingPrimaryDocuments: knowledge.attention
				.filter((item) => item.reason === 'document_missing')
				.map((item) => `${item.propertyId}:${item.headline}`),
			financeEntityLeakage: knowledge.documents
				.filter((document) => document.typeId === 'home-loan')
				.filter(
					(document) =>
						!document.linkedFinanceLoanId?.startsWith('reference-only:'),
				)
				.map((document) => document.chronicleDocumentId),
		},
	}
}

export function formatPropertyIntegrityAuditReport(
	result: PropertyIntegrityAuditResult,
): string {
	const lines = [
		`Generated: ${result.generatedAt}`,
		`Documents: ${result.summary.documentsDiscovered}`,
		`Properties: ${result.summary.propertiesCreated}`,
		`Timeline events: ${result.summary.timelineEvents}`,
		`Attention items: ${result.summary.attentionItems}`,
	]

	if (result.findings.duplicateProperties.length > 0) {
		lines.push(
			`Duplicate candidates: ${result.findings.duplicateProperties.join(', ')}`,
		)
	}

	return lines.join('\n')
}
