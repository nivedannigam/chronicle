import {
	getIdentityTypeDefinition,
	PRIMARY_IDENTITY_TYPE_IDS,
	resolveIdentityTypeId,
} from '@/features/identity-knowledge/services/identity-type.registry'
import { maskDocumentNumber } from '@/features/identity-knowledge/services/identity-mask.service'
import type {
	IdentityDocumentRecord,
	IdentityKnowledge,
} from '@/features/identity-knowledge/types/identity-knowledge.types'
import type { IdentityAskScope } from '@/features/identity/types/identity-ask.types'
import type {
	EvidenceBundle,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'

const RESOLVER_ID = 'identity.evidence_resolver.v1'

function normalizeText(value: string): string {
	return value.toLowerCase().replace(/\s+/g, ' ')
}

function resolveDocumentScope(
	knowledge: IdentityKnowledge,
	question: string,
	scope?: IdentityAskScope,
): IdentityDocumentRecord | null {
	if (scope?.documentId) {
		return (
			knowledge.documents.find(
				(document) =>
					document.chronicleDocumentId === scope.documentId ||
					document.id === scope.documentId,
			) ?? null
		)
	}

	if (scope?.typeId) {
		const matches = knowledge.documents.filter(
			(document) =>
				document.typeId === scope.typeId && document.versionRole !== 'previous',
		)
		return matches[0] ?? null
	}

	const normalized = normalizeText(question)
	const typeId = resolveIdentityTypeId({
		subCategoryId: null,
		fileName: question,
		text: question,
	})
	if (typeId) {
		const matches = knowledge.documents.filter(
			(document) =>
				document.typeId === typeId && document.versionRole !== 'previous',
		)

		if (matches.length === 1) {
			return matches[0]!
		}

		const ownerMatch = matches.find((document) =>
			normalized.includes(normalizeText(document.ownerName)),
		)
		if (ownerMatch) {
			return ownerMatch
		}

		return matches[0] ?? null
	}

	const ownerMatches = knowledge.documents.filter(
		(document) =>
			document.versionRole !== 'previous' &&
			normalized.includes(normalizeText(document.ownerName)),
	)

	if (ownerMatches.length === 1) {
		return ownerMatches[0]!
	}

	return null
}

function resolveMemberScope(
	knowledge: IdentityKnowledge,
	question: string,
): string | null {
	const normalized = normalizeText(question)

	for (const wallet of knowledge.memberWallets) {
		if (normalized.includes(normalizeText(wallet.memberName))) {
			return wallet.memberId
		}
	}

	return null
}

function formatDocumentNumber(document: IdentityDocumentRecord): string | null {
	return (
		document.maskedDocumentNumber ?? maskDocumentNumber(document.documentNumber)
	)
}

function formatExpiry(document: IdentityDocumentRecord): string {
	if (!document.expiryDate) {
		return `No expiry date is recorded for ${document.ownerName}'s ${document.typeLabel.toLowerCase()}.`
	}

	const masked = formatDocumentNumber(document)
	const suffix = masked ? ` ending in ${masked.replace('•••• ', '')}` : ''

	return `${document.ownerName}'s ${document.typeLabel}${suffix} expires on ${document.expiryDate}.`
}

function buildFactLookup(
	_knowledge: IdentityKnowledge,
	document: IdentityDocumentRecord | null,
	question: string,
): EvidenceBundle {
	if (!document) {
		return {
			reports: [],
			metrics: [],
			trends: [],
			timeline: [],
			summary: {
				headline: 'Identity record not found',
				lines: [],
				healthScore: null,
				limitations: [
					"I don't have a reliable identity record for that question yet.",
				],
			},
			metadata: {
				questionType: 'FACT_LOOKUP',
				resolver: RESOLVER_ID,
				excluded: [],
			},
		}
	}

	const lines: string[] = []

	if (/expir|valid until|when does.*expire/i.test(question)) {
		lines.push(formatExpiry(document))
	} else if (/number|aadhaar|pan|passport/i.test(question)) {
		const masked = formatDocumentNumber(document)
		lines.push(
			masked
				? `${document.typeLabel} on file for ${document.ownerName}: ${masked}.`
				: `I have ${document.ownerName}'s ${document.typeLabel.toLowerCase()} on file, but no document number is recorded yet.`,
		)
	} else {
		lines.push(
			`${document.ownerName}'s ${document.typeLabel} is on file${
				document.expiryDate ? ` until ${document.expiryDate}` : ''
			}.`,
		)
	}

	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: document.typeLabel,
			lines,
			healthScore: null,
			limitations: [],
		},
		metadata: {
			questionType: 'FACT_LOOKUP',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildEntityLookup(
	knowledge: IdentityKnowledge,
	memberId: string | null,
): EvidenceBundle {
	const documents = knowledge.documents.filter(
		(document) => document.versionRole !== 'previous',
	)
	const scopedDocuments = memberId
		? documents.filter((document) => document.ownerMemberId === memberId)
		: documents

	const lines =
		scopedDocuments.length > 0
			? scopedDocuments.map(
					(document) =>
						`${document.ownerName}: ${document.typeLabel}${
							document.expiryDate ? ` · expires ${document.expiryDate}` : ''
						}`,
				)
			: []

	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: 'Identity documents on file',
			lines,
			healthScore: null,
			limitations:
				lines.length > 0
					? []
					: ['No identity documents are organized for this family member yet.'],
		},
		metadata: {
			questionType: 'ENTITY_LOOKUP',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildCoverage(knowledge: IdentityKnowledge): EvidenceBundle {
	const missingTypes = PRIMARY_MISSING_TYPES(knowledge)
	const lines = [
		...knowledge.attentionItems.map(
			(item) => `${item.headline} · ${item.ownerName}`,
		),
		...missingTypes.map(
			(entry) => `${entry.memberName} is missing ${entry.label}.`,
		),
	]

	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: 'Identity coverage',
			lines,
			healthScore: null,
			limitations:
				lines.length > 0
					? [
							'Identity coverage is based on the identity documents Chronicle currently has.',
						]
					: [
							'All primary identity documents appear to be on file for the selected family view.',
						],
		},
		metadata: {
			questionType: 'COVERAGE',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function PRIMARY_MISSING_TYPES(knowledge: IdentityKnowledge): Array<{
	memberName: string
	label: string
}> {
	const missing: Array<{ memberName: string; label: string }> = []

	for (const wallet of knowledge.memberWallets) {
		const memberDocs = knowledge.documents.filter(
			(document) =>
				document.ownerMemberId === wallet.memberId &&
				document.versionRole !== 'previous' &&
				document.isPrimaryType,
		)

		for (const typeId of PRIMARY_IDENTITY_TYPE_IDS) {
			if (memberDocs.some((document) => document.typeId === typeId)) {
				continue
			}

			missing.push({
				memberName: wallet.memberName,
				label: getIdentityTypeDefinition(typeId).label,
			})
		}
	}

	return missing
}

function buildLatestDocument(
	knowledge: IdentityKnowledge,
	document: IdentityDocumentRecord | null,
): EvidenceBundle {
	if (!document) {
		return buildFactLookup(knowledge, null, 'latest document')
	}

	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: document.typeLabel,
			lines: [
				`Latest ${document.typeLabel.toLowerCase()} for ${document.ownerName} was added on ${new Date(document.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`,
			],
			healthScore: null,
			limitations: [],
		},
		metadata: {
			questionType: 'LATEST_REPORT',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildStatusOverview(knowledge: IdentityKnowledge): EvidenceBundle {
	const lines = knowledge.memberWallets.flatMap((wallet) => [
		`${wallet.memberName}: ${wallet.documentCount} identity document${wallet.documentCount === 1 ? '' : 's'} on file`,
		...wallet.primaryChips.map(
			(chip) =>
				`${wallet.memberName} · ${chip.label}${chip.checkmark ? ' · on file' : ' · missing'}`,
		),
	])

	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: 'Identity overview',
			lines,
			healthScore: null,
			limitations: knowledge.isOrganizing
				? ['Some identity documents are still being organized.']
				: [],
		},
		metadata: {
			questionType: 'STATUS_OVERVIEW',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

export function isIdentityCoverageQuestion(question: string): boolean {
	return /missing|do you have all|which documents are missing|documents are missing|coverage/i.test(
		question,
	)
}

export function isIdentityEntityLookupQuestion(question: string): boolean {
	return /what identity documents|which documents do i have|do .* have a|documents do we have/i.test(
		question,
	)
}

export function supportsIdentityEvidenceQuestion(
	questionType: QuestionType,
): boolean {
	return [
		'FACT_LOOKUP',
		'ENTITY_LOOKUP',
		'LATEST_REPORT',
		'COVERAGE',
		'STATUS_OVERVIEW',
		'EXPLAIN',
	].includes(questionType)
}

export function resolveIdentityEvidence(input: {
	knowledge: IdentityKnowledge
	request: EvidenceRequest
	scope?: IdentityAskScope
}): EvidenceBundle {
	const document = resolveDocumentScope(
		input.knowledge,
		input.request.question,
		input.scope,
	)
	const memberId = resolveMemberScope(input.knowledge, input.request.question)

	switch (input.request.questionType) {
		case 'FACT_LOOKUP':
			return buildFactLookup(input.knowledge, document, input.request.question)
		case 'ENTITY_LOOKUP':
			return buildEntityLookup(input.knowledge, memberId)
		case 'COVERAGE':
			return buildCoverage(input.knowledge)
		case 'LATEST_REPORT':
			return buildLatestDocument(input.knowledge, document)
		case 'EXPLAIN':
		case 'STATUS_OVERVIEW':
		default:
			return buildStatusOverview(input.knowledge)
	}
}
