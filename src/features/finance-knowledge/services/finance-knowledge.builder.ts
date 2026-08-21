import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import {
	classifyFinanceDocument,
	getFinanceDocumentTypeLabel,
	isFinanceDocumentOrganizing,
	readFinanceClassificationFromMetadata,
} from '@/features/finance-knowledge/services/finance-document-classifier.service'
import { compareFinancialDates } from '@/features/finance-knowledge/services/finance-observation.service'
import { deriveFinanceRecordsFromDocuments } from '@/features/finance-knowledge/services/derive-finance-records-from-documents.service'
import { filterFinanceEntitiesForMember } from '@/features/finance-knowledge/services/finance-member-filter.service'
import {
	buildFinanceSnapshot,
	buildFinanceSnapshotHomeView,
} from '@/features/finance-knowledge/services/finance-snapshot.service'
import { buildFinanceTimelineEvents } from '@/features/finance-knowledge/services/finance-timeline.builder.service'
import type { FinanceDocumentExtractionPayload } from '@/features/finance-knowledge/types/finance-extraction.types'
import type { FinanceCoverageMeta } from '@/features/finance-knowledge/types/finance-history.types'
import type { FinanceDocumentType } from '@/features/finance-knowledge/types/finance-classification.types'
import type {
	FinanceDocumentRef,
	FinanceDocumentTypeCount,
	FinanceEntityCounts,
	FinanceEntitySummary,
	FinanceKnowledge,
	FinanceSetupStatus,
	FinanceSummary,
} from '@/features/finance-knowledge/types/finance-knowledge.types'

function readMetaString(
	metadata: Record<string, unknown>,
	key: string,
): string | null {
	const value = metadata[key]
	return typeof value === 'string' && value.trim() ? value.trim() : null
}

function resolveOwnerName(
	memberId: string | null,
	members: FamilyMemberWithAliases[],
): string {
	if (!memberId) {
		return 'Unassigned'
	}

	return (
		members.find((member) => member.id === memberId)?.displayName ??
		'Unassigned'
	)
}

function resolveConsumerStatus(
	document: ChronicleDocument,
	classificationOrganizing: boolean,
): FinanceDocumentRef['consumerStatus'] {
	if (document.status === 'failed') {
		return 'needs_help'
	}

	if (document.status === 'processing' || classificationOrganizing) {
		return 'organizing'
	}

	return 'ready'
}

function isFinanceDocument(document: ChronicleDocument): boolean {
	return document.category_id === 'financial'
}

function resolveSetupStatus(input: {
	hasFolderAssigned: boolean
	documents: ChronicleDocument[]
	hasOrganizingDocuments: boolean
	isLoading?: boolean
}): FinanceSetupStatus {
	if (!input.hasFolderAssigned) {
		return 'not_connected'
	}

	if (input.isLoading && input.documents.length === 0) {
		return 'scanning'
	}

	const processing = input.documents.some(
		(document) => document.status === 'processing',
	)

	if (processing || input.hasOrganizingDocuments) {
		return 'organizing'
	}

	if (input.documents.length === 0) {
		return 'empty'
	}

	return 'ready'
}

function resolveDocumentType(
	document: FinanceDocumentRef,
): FinanceDocumentType {
	return (document.subCategoryId ?? 'other') as FinanceDocumentType
}

function buildDocumentTypeCounts(
	documents: FinanceDocumentRef[],
): FinanceDocumentTypeCount[] {
	const counts = new Map<FinanceDocumentType, number>()

	for (const document of documents) {
		const id = resolveDocumentType(document)
		counts.set(id, (counts.get(id) ?? 0) + 1)
	}

	return [...counts.entries()]
		.map(([id, count]) => ({
			id,
			label: getFinanceDocumentTypeLabel(id),
			count,
		}))
		.filter((entry) => entry.id !== 'other' || entry.count > 0)
		.sort((left, right) => right.count - left.count)
}

function readFinanceExtraction(
	metadata: Record<string, unknown>,
): FinanceDocumentExtractionPayload | null {
	const payload = metadata.financeExtraction
	return payload && typeof payload === 'object'
		? (payload as FinanceDocumentExtractionPayload)
		: null
}

function buildSummary(input: {
	setupStatus: FinanceSetupStatus
	documentTypeCounts: FinanceDocumentTypeCount[]
	documentCount: number
	entityCount: number
	bankAccountCount: number
	investmentAccountCount: number
	creditCardCount: number
	loanCount: number
}): FinanceSummary {
	let headline = 'Connect your Finance folder to begin'
	let subline: string | null = null
	let coverageLevel: FinanceSummary['coverageLevel'] = 'not_setup'

	switch (input.setupStatus) {
		case 'not_connected':
			break
		case 'scanning':
		case 'organizing':
			headline = 'Your financial picture is taking shape'
			subline = 'Chronicle is organizing your financial documents.'
			coverageLevel = 'organizing'
			break
		case 'empty':
			headline = 'No financial documents found yet'
			subline = 'Add statements and records to your Finance folder.'
			coverageLevel = 'partial'
			break
		default:
			headline = 'Your financial picture is taking shape'
			if (input.entityCount > 0 && input.documentCount > 0) {
				subline = `Chronicle has organized ${input.entityCount} financial account${input.entityCount === 1 ? '' : 's'} from ${input.documentCount} document${input.documentCount === 1 ? '' : 's'}.`
			} else {
				subline =
					input.documentCount > 0
						? `${input.documentCount} financial document${input.documentCount === 1 ? '' : 's'} organized`
						: null
			}
			coverageLevel = input.documentCount > 0 ? 'documented' : 'partial'
			break
	}

	return {
		headline,
		subline,
		coverageLevel,
		documentCount: input.documentCount,
		documentTypeCounts: input.documentTypeCounts,
		bankAccountCount: input.bankAccountCount,
		investmentAccountCount: input.investmentAccountCount,
		creditCardCount: input.creditCardCount,
		loanCount: input.loanCount,
		taxRecordCount: 0,
		holdingCount: 0,
		assetTotalKnown: null,
		liabilityTotalKnown: null,
		netWorthKnown: null,
	}
}

function applySnapshotToSummary(
	summary: FinanceSummary,
	snapshot: ReturnType<typeof buildFinanceSnapshot>,
): FinanceSummary {
	return {
		...summary,
		assetTotalKnown: snapshot.assetsTotal,
		liabilityTotalKnown: snapshot.liabilitiesTotal,
		netWorthKnown: snapshot.netWorth,
	}
}

function mapFinanceDocument(input: {
	document: ChronicleDocument
	members: FamilyMemberWithAliases[]
}): FinanceDocumentRef {
	const metadata = input.document.extracted_metadata ?? {}
	const folderPath = readMetaString(metadata, 'folderPath')
	const storedClassification = readFinanceClassificationFromMetadata(metadata)
	const classification =
		storedClassification ??
		classifyFinanceDocument({
			fileName: input.document.file_name,
			folderPath,
			mimeType: input.document.mime_type,
			subCategoryId: input.document.sub_category_id,
			extractedMetadata: metadata,
			extractedText: input.document.extracted_text,
		})
	const displayLabel =
		readMetaString(metadata, 'financeDisplayLabel') ??
		input.document.knowledge_refs.find((ref) => ref.domain === 'finance')
			?.label ??
		input.document.title.replace(/^Finance · /, '')
	const extraction = readFinanceExtraction(metadata)

	return {
		id: input.document.id,
		chronicleDocumentId: input.document.id,
		title: input.document.title,
		fileName: input.document.file_name,
		displayLabel,
		subCategoryId: classification.type,
		subCategoryLabel: getFinanceDocumentTypeLabel(classification.type),
		classificationConfidence: classification.confidence,
		ownerMemberId: input.document.family_member_id,
		ownerName: resolveOwnerName(input.document.family_member_id, input.members),
		consumerStatus: resolveConsumerStatus(
			input.document,
			isFinanceDocumentOrganizing(classification),
		),
		uploadedAt: input.document.uploaded_at,
		folderPath,
		institutionName: extraction?.institutionName ?? null,
		statementDate: extraction?.statementDate ?? null,
		statementPeriodStart: extraction?.statementPeriodStart ?? null,
		statementPeriodEnd: extraction?.statementPeriodEnd ?? null,
		linkedEntityId: extraction?.entityId ?? null,
		linkedEntityName: extraction?.displayName ?? null,
		extractionStatus: extraction?.status ?? null,
		extractionUserMessage: extraction?.userMessage ?? null,
	}
}

export function buildFinanceKnowledge(input: {
	userId: string
	documents: ChronicleDocument[]
	members: FamilyMemberWithAliases[]
	hasFolderAssigned: boolean
	isLoading?: boolean
	selectedMemberId?: string | null
}): FinanceKnowledge {
	const allFinanceDocuments = input.documents.filter(isFinanceDocument)
	const canonicalDerived =
		deriveFinanceRecordsFromDocuments(allFinanceDocuments)

	const visibleDocuments = allFinanceDocuments.filter(
		(document) =>
			!input.selectedMemberId ||
			document.family_member_id === input.selectedMemberId,
	)

	const derived = filterFinanceEntitiesForMember({
		derived: canonicalDerived,
		documents: allFinanceDocuments,
		selectedMemberId: input.selectedMemberId,
	})

	const documentRefs = visibleDocuments.map((document) =>
		mapFinanceDocument({ document, members: input.members }),
	)

	const hasOrganizingDocuments = documentRefs.some(
		(document) => document.consumerStatus === 'organizing',
	)

	const setupStatus = resolveSetupStatus({
		hasFolderAssigned: input.hasFolderAssigned,
		documents: visibleDocuments,
		hasOrganizingDocuments,
		isLoading: input.isLoading,
	})

	const documentTypeCounts = buildDocumentTypeCounts(documentRefs)
	const entityCount =
		derived.bankAccounts.length +
		derived.creditCards.length +
		derived.loans.length +
		derived.investmentAccounts.length

	const summary = buildSummary({
		setupStatus,
		documentTypeCounts,
		documentCount: documentRefs.length,
		entityCount,
		bankAccountCount: derived.bankAccounts.length,
		investmentAccountCount: derived.investmentAccounts.length,
		creditCardCount: derived.creditCards.length,
		loanCount: derived.loans.length,
	})

	const isOrganizing = setupStatus === 'organizing'
	const hasExtractedEntities = entityCount > 0
	const hasFailedExtraction = documentRefs.some(
		(document) => document.extractionStatus === 'failed',
	)
	const ambiguousEntityCount = [
		...derived.bankAccounts,
		...derived.creditCards,
		...derived.loans,
		...derived.investmentAccounts,
	].filter((entity) => entity.resolutionState === 'ambiguous').length
	const conflictingObservationCount = derived.historicalFacts.filter(
		(observation) => observation.isConflicting,
	).length
	const extractedDocumentCount = documentRefs.filter(
		(document) => document.extractionStatus === 'complete',
	).length
	const incompleteDocumentCount = documentRefs.filter(
		(document) =>
			document.extractionStatus === 'incomplete' ||
			document.extractionStatus === 'failed' ||
			document.subCategoryId === 'other' ||
			document.classificationConfidence === 'low',
	).length

	const coverage: FinanceCoverageMeta = {
		level: summary.coverageLevel,
		entityCount,
		documentCount: documentRefs.length,
		extractedDocumentCount,
		incompleteDocumentCount,
		ambiguousEntityCount,
		conflictingObservationCount,
	}

	const snapshot = buildFinanceSnapshot({
		bankAccounts: derived.bankAccounts,
		investmentAccounts: derived.investmentAccounts,
		creditCards: derived.creditCards,
		loans: derived.loans,
		holdings: [],
		documents: documentRefs,
		coverage,
	})

	const summaryWithSnapshot = applySnapshotToSummary(summary, snapshot)

	const timelineResult = buildFinanceTimelineEvents({
		bankAccounts: derived.bankAccounts,
		creditCards: derived.creditCards,
		loans: derived.loans,
		investmentAccounts: derived.investmentAccounts,
		historicalFacts: derived.historicalFacts,
		documents: documentRefs,
		recentLimit: 3,
	})

	return {
		userId: input.userId,
		setupStatus,
		hasFolderAssigned: input.hasFolderAssigned,
		hasDocuments: documentRefs.length > 0,
		isOrganizing,
		documentCount: documentRefs.length,
		summary: summaryWithSnapshot,
		coverage,
		snapshot,
		bankAccounts: derived.bankAccounts,
		investmentAccounts: derived.investmentAccounts,
		creditCards: derived.creditCards,
		loans: derived.loans,
		taxRecords: [],
		holdings: [],
		financialFacts: derived.financialFacts,
		currentFacts: derived.currentFacts,
		historicalFacts: derived.historicalFacts,
		documents: documentRefs,
		attention: buildAttentionItems({
			incompleteDocumentCount,
			ambiguousEntityCount,
			conflictingObservationCount,
		}),
		recentChanges: [],
		timeline: timelineResult.events,
		limitations: [
			...new Set([
				...buildLimitations({
					documentCount: documentRefs.length,
					entityCount,
					hasFailedExtraction,
					ambiguousEntityCount,
					conflictingObservationCount,
					incompleteDocumentCount,
				}),
				...snapshot.coverage.limitations,
			]),
		],
		confidence: {
			overall: hasExtractedEntities
				? 'medium'
				: documentRefs.length > 0
					? 'low'
					: 'low',
			notes: buildConfidenceNotes({
				documentCount: documentRefs.length,
				entityCount,
				hasFailedExtraction,
			}),
		},
	}
}

function buildLimitations(input: {
	documentCount: number
	entityCount: number
	hasFailedExtraction: boolean
	ambiguousEntityCount: number
	conflictingObservationCount: number
	incompleteDocumentCount: number
}): string[] {
	if (input.documentCount === 0) {
		return []
	}

	const notes = [
		'Financial totals are based on available statement records only.',
	]

	if (input.entityCount === 0) {
		notes.unshift('Account details are still being read from your statements.')
	}

	if (input.incompleteDocumentCount > 0) {
		notes.push('Some financial records still need review.')
	}

	if (input.ambiguousEntityCount > 0) {
		notes.push('Some financial records need a closer look.')
	}

	if (input.conflictingObservationCount > 0) {
		notes.push('Some statement values disagree and need review.')
	}

	if (input.hasFailedExtraction) {
		notes.push(
			"Some documents couldn't be read yet — they remain available in Library.",
		)
	}

	return notes
}

function buildConfidenceNotes(input: {
	documentCount: number
	entityCount: number
	hasFailedExtraction: boolean
}): string[] {
	if (input.documentCount === 0) {
		return ['No financial documents organized yet.']
	}

	if (input.entityCount > 0) {
		return ['Facts are sourced from extracted statement fields only.']
	}

	return ['Documents classified — financial facts not extracted yet.']
}

function buildAttentionItems(input: {
	incompleteDocumentCount: number
	ambiguousEntityCount: number
	conflictingObservationCount: number
}): import('@/features/finance-knowledge/types/finance-knowledge.types').FinanceAttentionItem[] {
	const items: import('@/features/finance-knowledge/types/finance-knowledge.types').FinanceAttentionItem[] =
		[]

	if (input.incompleteDocumentCount > 0) {
		items.push({
			id: 'incomplete-documents',
			entityId: null,
			documentId: null,
			headline: 'Some records still need review',
			subline: `${input.incompleteDocumentCount} document${input.incompleteDocumentCount === 1 ? '' : 's'}`,
			severity: 'medium',
		})
	}

	if (input.ambiguousEntityCount > 0) {
		items.push({
			id: 'ambiguous-entities',
			entityId: null,
			documentId: null,
			headline: 'Some accounts need confirmation',
			subline: `${input.ambiguousEntityCount} account${input.ambiguousEntityCount === 1 ? '' : 's'}`,
			severity: 'medium',
		})
	}

	if (input.conflictingObservationCount > 0) {
		items.push({
			id: 'conflicting-observations',
			entityId: null,
			documentId: null,
			headline: 'Conflicting statement values detected',
			subline: `${input.conflictingObservationCount} conflict${input.conflictingObservationCount === 1 ? '' : 's'}`,
			severity: 'high',
		})
	}

	return items.slice(0, 3)
}

function buildEntityCounts(knowledge: FinanceKnowledge): FinanceEntityCounts {
	const bankAccounts = knowledge.bankAccounts.length
	const creditCards = knowledge.creditCards.length
	const loans = knowledge.loans.length
	const investmentAccounts = knowledge.investmentAccounts.length

	return {
		bankAccounts,
		creditCards,
		loans,
		investmentAccounts,
		total: bankAccounts + creditCards + loans + investmentAccounts,
	}
}

function buildEntitySummaries(
	knowledge: FinanceKnowledge,
): FinanceEntitySummary[] {
	const entities = [
		...knowledge.bankAccounts,
		...knowledge.creditCards,
		...knowledge.loans,
		...knowledge.investmentAccounts,
	]

	return entities.map((entity) => ({
		id: entity.id,
		kind: entity.kind,
		displayName: entity.displayName,
		institutionName: entity.institutionName,
		maskedIdentifier: entity.maskedIdentifier,
		latestStatementDate: entity.latestStatementDate,
		lastUpdatedFromDocumentAt: entity.lastUpdatedFromDocumentAt,
		ownership: entity.ownership,
		hasConflict: entity.conflictingFactTypes.length > 0,
	}))
}

export function buildFinanceHomeViewModel(input: {
	knowledge: FinanceKnowledge
	selectedMemberName?: string | null
}): import('@/features/finance-knowledge/types/finance-knowledge.types').FinanceHomeViewModel {
	const { knowledge } = input
	let statusSubline = knowledge.summary.subline

	if (input.selectedMemberName && knowledge.documentCount > 0) {
		statusSubline = `Showing ${input.selectedMemberName}'s financial documents · ${knowledge.documentCount} organized`
	}

	const hasIncompleteCoverage =
		knowledge.coverage.incompleteDocumentCount > 0 ||
		knowledge.documents.some(
			(document) =>
				document.classificationConfidence === 'low' ||
				document.subCategoryId === 'other' ||
				document.consumerStatus === 'organizing',
		)

	return {
		setupStatus: knowledge.setupStatus,
		statusHeadline: knowledge.snapshot.showNetWorth
			? knowledge.snapshot.headline
			: knowledge.summary.headline,
		statusSubline: knowledge.snapshot.showNetWorth
			? knowledge.snapshot.confidenceLabel
			: statusSubline,
		documentTypeCounts: knowledge.summary.documentTypeCounts,
		entityCounts: buildEntityCounts(knowledge),
		entitySummaries: buildEntitySummaries(knowledge),
		snapshot: buildFinanceSnapshotHomeView(
			knowledge.snapshot,
			knowledge.coverage,
		),
		attentionItems: knowledge.attention,
		askSuggestions: [
			'How is my financial picture?',
			'What financial documents do I have?',
			'What belongs in Finance?',
		],
		showLibraryLink: knowledge.hasDocuments,
		documentCount: knowledge.documentCount,
		coverageOrganizingNote:
			knowledge.hasDocuments && hasIncompleteCoverage
				? 'Some financial records still need review.'
				: null,
		recentActivity: [...knowledge.timeline]
			.sort((left, right) =>
				compareFinancialDates(right.eventDate, left.eventDate),
			)
			.slice(0, 3)
			.map((event) => ({
				id: event.id,
				title: event.title,
				entityDisplayName: event.entityDisplayName,
				eventDate: event.eventDate,
			})),
		showHistoryLink: knowledge.hasFolderAssigned,
	}
}
