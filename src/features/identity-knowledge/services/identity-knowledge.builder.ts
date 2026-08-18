import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { mergeDocumentsWithConnectorRecords } from '@/features/documents/services/document-import.service'
import type { ConnectorDocumentRecord } from '@/core/connectors'
import { buildIdentityAttentionItems } from '@/features/identity-knowledge/services/identity-attention.service'
import { maskDocumentNumber } from '@/features/identity-knowledge/services/identity-mask.service'
import { resolveIdentityOwnerMemberId } from '@/features/identity-knowledge/services/identity-member-resolver.service'
import {
	buildIdentityDocumentSummary,
	buildWalletChipStatusLine,
} from '@/features/identity-knowledge/services/identity-summary.service'
import {
	getIdentityTypeDefinition,
	PRIMARY_IDENTITY_TYPE_IDS,
	resolveIdentityTypeId,
} from '@/features/identity-knowledge/services/identity-type.registry'
import { assignVersionRoles } from '@/features/identity-knowledge/services/identity-version.service'
import type {
	IdentityDocumentRecord,
	IdentityDocumentStatus,
	IdentityKnowledge,
	IdentityMemberWallet,
	IdentityTimelineEvent,
	IdentityWalletChip,
} from '@/features/identity-knowledge/types/identity-knowledge.types'

const MS_DAY = 1000 * 60 * 60 * 24

function readMetaString(
	metadata: Record<string, unknown>,
	key: string,
): string | null {
	const value = metadata[key]
	return typeof value === 'string' && value.trim() ? value.trim() : null
}

function resolveDocumentStatus(input: {
	document: ChronicleDocument
	typeHasExpiry: boolean
}): IdentityDocumentStatus {
	if (input.document.status === 'processing') {
		return 'still_organizing'
	}

	if (input.document.status === 'failed') {
		return 'needs_clearer_copy'
	}

	if (!input.typeHasExpiry || !input.document.expiry_date) {
		return 'on_file'
	}

	const expiry = Date.parse(input.document.expiry_date)

	if (Number.isNaN(expiry)) {
		return 'on_file'
	}

	if (expiry < Date.now()) {
		return 'expired'
	}

	const days = Math.ceil((expiry - Date.now()) / MS_DAY)

	if (days <= 90) {
		return 'expires_soon'
	}

	return 'valid_until'
}

function mapChronicleDocument(input: {
	document: ChronicleDocument
	members: FamilyMemberWithAliases[]
	accountOwnerMemberId: string | null
}): IdentityDocumentRecord | null {
	const folderPath = readMetaString(
		input.document.extracted_metadata ?? {},
		'folderPath',
	)
	const typeId = resolveIdentityTypeId({
		subCategoryId: input.document.sub_category_id,
		fileName: input.document.file_name,
		folderPath,
		text: input.document.extracted_text,
	})
	const typeDef = getIdentityTypeDefinition(typeId)
	const owner = resolveIdentityOwnerMemberId({
		documentMemberId: input.document.family_member_id,
		folderPath,
		fileName: input.document.file_name,
		members: input.members,
		accountOwnerMemberId: input.accountOwnerMemberId,
	})
	const metadata = input.document.extracted_metadata ?? {}
	const status = resolveDocumentStatus({
		document: input.document,
		typeHasExpiry: typeDef.hasExpiry,
	})

	const record: IdentityDocumentRecord = {
		id: input.document.id,
		chronicleDocumentId: input.document.id,
		typeId,
		typeLabel: typeDef.label,
		ownerMemberId: owner.memberId,
		ownerName: owner.memberName,
		title: input.document.title,
		fileName: input.document.file_name,
		documentNumber: input.document.document_number,
		maskedDocumentNumber: maskDocumentNumber(input.document.document_number),
		issueDate: input.document.issue_date,
		expiryDate: input.document.expiry_date,
		issuer: input.document.issuer,
		nationality: readMetaString(metadata, 'nationality'),
		dateOfBirth:
			readMetaString(metadata, 'dateOfBirth') ??
			readMetaString(metadata, 'date_of_birth'),
		status,
		versionRole: 'current',
		consumerStatus:
			input.document.status === 'processing'
				? 'organizing'
				: input.document.status === 'failed'
					? 'needs_help'
					: 'ready',
		summary: '',
		storagePath: input.document.storage_path,
		mimeType: input.document.mime_type,
		uploadedAt: input.document.uploaded_at,
		folderPath,
		isPrimaryType: typeDef.tier === 'primary',
	}

	record.summary = buildIdentityDocumentSummary(record)
	return record
}

function isIdentityDocument(document: ChronicleDocument): boolean {
	if (document.category_id === 'identity') {
		return true
	}

	const inferred = resolveIdentityTypeId({
		subCategoryId: document.sub_category_id,
		fileName: document.file_name,
		folderPath: readMetaString(document.extracted_metadata ?? {}, 'folderPath'),
		text: document.extracted_text,
	})

	return inferred !== 'other' && document.category_id !== 'medical'
}

function buildMemberWallets(input: {
	documents: IdentityDocumentRecord[]
	members: FamilyMemberWithAliases[]
}): IdentityMemberWallet[] {
	return input.members.map((member) => {
		const memberDocs = input.documents.filter(
			(document) =>
				document.ownerMemberId === member.id &&
				document.versionRole !== 'previous',
		)
		const primaryDocs = memberDocs.filter((document) => document.isPrimaryType)
		const chips: IdentityWalletChip[] = []
		let overflowCount = 0

		for (const typeId of PRIMARY_IDENTITY_TYPE_IDS) {
			const match = primaryDocs.find((document) => document.typeId === typeId)

			if (!match) {
				continue
			}

			if (chips.length >= 4) {
				overflowCount += 1
				continue
			}

			chips.push({
				typeId,
				label: match.typeLabel,
				checkmark:
					match.status === 'on_file' ||
					match.status === 'valid_until' ||
					(match.status !== 'expired' &&
						match.status !== 'expires_soon' &&
						match.status !== 'still_organizing'),
				statusLine: buildWalletChipStatusLine(match),
				hasAttention:
					match.status === 'expired' || match.status === 'expires_soon',
			})
		}

		const secondaryCount = memberDocs.filter(
			(document) => !document.isPrimaryType,
		).length
		overflowCount +=
			Math.max(0, primaryDocs.length - chips.length) + secondaryCount

		return {
			memberId: member.id,
			memberName: member.displayName,
			avatarInitial: member.displayName.charAt(0).toUpperCase(),
			primaryChips: chips,
			overflowCount,
			overflowLabel: overflowCount > 0 ? `+ ${overflowCount} more` : null,
			documentCount: memberDocs.length,
		}
	})
}

function buildTimelineEvents(
	documents: IdentityDocumentRecord[],
): IdentityTimelineEvent[] {
	const events: IdentityTimelineEvent[] = []

	for (const document of documents) {
		if (document.versionRole === 'previous') {
			continue
		}

		const text = `${document.title} ${document.fileName}`.toLowerCase()

		if (document.issueDate) {
			events.push({
				id: `issue-${document.chronicleDocumentId}`,
				documentId: document.chronicleDocumentId,
				title: /renew/i.test(text)
					? `${document.typeLabel} renewed`
					: `${document.typeLabel} issued`,
				timestamp: document.issueDate,
				eventType: /renew/i.test(text) ? 'renewed' : 'issued',
			})
		} else if (document.uploadedAt) {
			events.push({
				id: `added-${document.chronicleDocumentId}`,
				documentId: document.chronicleDocumentId,
				title: `${document.typeLabel} added`,
				timestamp: document.uploadedAt,
				eventType: 'added',
			})
		}
	}

	return events.sort(
		(a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
	)
}

export function buildIdentityKnowledge(input: {
	userId: string
	documents: ChronicleDocument[]
	connectorRecords?: ConnectorDocumentRecord[]
	members: FamilyMemberWithAliases[]
	accountOwnerMemberId: string | null
}): IdentityKnowledge {
	const merged = mergeDocumentsWithConnectorRecords({
		documents: input.documents,
		connectorRecords: input.connectorRecords ?? [],
	})

	const identityDocs = merged
		.filter(isIdentityDocument)
		.map((document) =>
			mapChronicleDocument({
				document,
				members: input.members,
				accountOwnerMemberId: input.accountOwnerMemberId,
			}),
		)
		.filter((document): document is IdentityDocumentRecord => document !== null)

	const versioned = assignVersionRoles({
		userId: input.userId,
		documents: identityDocs,
	})

	const currentDocuments = versioned.filter(
		(document) => document.versionRole !== 'previous',
	)

	return {
		userId: input.userId,
		documents: versioned,
		attentionItems: buildIdentityAttentionItems(currentDocuments),
		memberWallets: buildMemberWallets({
			documents: versioned,
			members: input.members,
		}),
		documentCount: currentDocuments.length,
		hasDocuments: currentDocuments.length > 0,
		isOrganizing: versioned.some(
			(document) => document.consumerStatus === 'organizing',
		),
		timelineEvents: buildTimelineEvents(versioned),
	}
}

export function filterIdentityKnowledgeForMember(
	knowledge: IdentityKnowledge,
	memberId: string | null,
): IdentityKnowledge {
	if (!memberId) {
		return knowledge
	}

	const documents = knowledge.documents.filter(
		(document) => document.ownerMemberId === memberId,
	)

	return {
		...knowledge,
		documents,
		attentionItems: buildIdentityAttentionItems(
			documents.filter((document) => document.versionRole !== 'previous'),
		),
		memberWallets: knowledge.memberWallets.filter(
			(wallet) => wallet.memberId === memberId,
		),
		documentCount: documents.filter(
			(document) => document.versionRole !== 'previous',
		).length,
		hasDocuments: documents.some(
			(document) => document.versionRole !== 'previous',
		),
	}
}
