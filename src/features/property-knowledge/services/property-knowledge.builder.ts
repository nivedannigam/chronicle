import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type {
	PropertyCrossModuleReference,
	PropertyDocumentRecord,
	PropertyFact,
	PropertyHomeViewModel,
	PropertyKnowledge,
	PropertyRecord,
	PropertySetupStatus,
	PropertyTimelineEvent,
} from '@/features/property-knowledge/types/property-knowledge.types'
import { buildPropertyAttentionItems } from '@/features/property-knowledge/services/property-attention.engine'
import {
	buildPropertyEntityKey,
	createPropertyRecordStub,
	formatOwnershipLabel,
	mergePropertyCandidates,
	resolveOwnershipFromEvidence,
	type PropertyEntityCandidate,
} from '@/features/property-knowledge/services/property-entity-resolver.service'
import {
	resolvePropertyNameFromPath,
	slugifyPropertyName,
} from '@/features/property-knowledge/services/property-folder-resolver'
import { maskPropertyIdentifier } from '@/features/property-knowledge/services/property-mask.service'
import {
	getPropertyDocumentTypeDefinition,
	getPropertyTypeDefinition,
	inferPropertyTypeId,
	resolvePropertyDocumentTypeId,
} from '@/features/property-knowledge/services/property-type.registry'

function resolveFolderPath(document: ChronicleDocument): string | null {
	const metadata = document.extracted_metadata as { folderPath?: string } | null

	return metadata?.folderPath ?? null
}

function resolveMemberName(
	memberId: string | null | undefined,
	members: FamilyMemberWithAliases[],
): string {
	if (!memberId) {
		return 'Family'
	}

	return (
		members.find((member) => member.id === memberId)?.displayName ?? 'Family'
	)
}

function readDateFromDocument(document: ChronicleDocument): string | null {
	return (
		document.issue_date ??
		document.expiry_date ??
		(document.extracted_metadata as { documentDate?: string } | null)
			?.documentDate ??
		null
	)
}

function readExplicitOwnership(
	document: ChronicleDocument,
):
	| import('@/features/property-knowledge/types/property-knowledge.types').PropertyOwnership
	| null {
	const metadata = document.extracted_metadata as { ownership?: string } | null
	const value = metadata?.ownership?.toLowerCase()

	if (value === 'individual' || value === 'joint' || value === 'family') {
		return value
	}

	return null
}

function buildDocumentRecord(input: {
	document: ChronicleDocument
	propertyId: string
	members: FamilyMemberWithAliases[]
}): PropertyDocumentRecord {
	const folderPath = resolveFolderPath(input.document)
	const typeId = resolvePropertyDocumentTypeId({
		subCategoryId: input.document.sub_category_id,
		fileName: input.document.file_name,
		folderPath,
		title: input.document.title,
	})
	const typeLabel = getPropertyDocumentTypeDefinition(typeId).label
	const registrationNumber = input.document.document_number ?? null

	return {
		id: `property-doc-${input.document.id}`,
		chronicleDocumentId: input.document.id,
		propertyId: input.propertyId,
		typeId,
		typeLabel,
		title: input.document.title,
		fileName: input.document.file_name,
		ownerMemberId: input.document.family_member_id,
		ownerName: resolveMemberName(
			input.document.family_member_id,
			input.members,
		),
		documentDate: readDateFromDocument(input.document),
		expiryDate: input.document.expiry_date,
		registrationNumber,
		maskedRegistrationNumber: maskPropertyIdentifier(registrationNumber),
		consumerStatus:
			input.document.status === 'processing' ? 'organizing' : 'ready',
		classificationConfidence:
			typeId === 'other'
				? 'low'
				: input.document.sub_category_id
					? 'high'
					: 'medium',
		uploadedAt: input.document.uploaded_at,
		folderPath,
		summary: `${typeLabel} · ${input.document.title}`,
		linkedFinanceLoanId:
			typeId === 'home-loan' ? `reference-only:${input.document.id}` : null,
		linkedInsurancePolicyId:
			typeId === 'property-insurance'
				? `reference-only:${input.document.id}`
				: null,
	}
}

function buildPropertyCandidates(input: {
	documents: ChronicleDocument[]
	rootFolderPath?: string | null
}): PropertyEntityCandidate[] {
	const candidates: PropertyEntityCandidate[] = []

	for (const document of input.documents) {
		const folderPath = resolveFolderPath(document)
		const displayName = resolvePropertyNameFromPath({
			folderPath,
			rootFolderPath: input.rootFolderPath,
		})

		candidates.push({
			displayName,
			slug: buildPropertyEntityKey(displayName),
			folderPaths: folderPath ? [folderPath] : [],
			documentIds: [document.id],
			ownerMemberIds: document.family_member_id
				? [document.family_member_id]
				: [],
		})
	}

	return mergePropertyCandidates(candidates)
}

function inferCityFromPropertyName(displayName: string): string | null {
	const match = displayName.match(
		/^([A-Za-z\s]+)\s+(Home|House|Apartment|Villa|Plot)/i,
	)

	if (match?.[1]) {
		return match[1].trim()
	}

	return null
}

function applyFactsFromDocuments(input: {
	property: PropertyRecord
	documents: PropertyDocumentRecord[]
}): PropertyRecord {
	const facts: PropertyFact[] = []
	let purchaseDate = input.property.purchaseDate
	let possessionDate = input.property.possessionDate
	let registrationDate = input.property.registrationDate
	const references: PropertyCrossModuleReference[] = [
		...input.property.references,
	]

	for (const document of input.documents.filter(
		(entry) => entry.propertyId === input.property.id,
	)) {
		if (document.typeId === 'purchase-sale' && document.documentDate) {
			purchaseDate = purchaseDate ?? document.documentDate
			facts.push({
				key: 'purchaseDate',
				label: 'Purchase date',
				displayValue: document.documentDate,
				asOfDate: document.documentDate,
				sourceDocumentId: document.chronicleDocumentId,
				confidence: 'high',
			})
		}

		if (document.typeId === 'possession' && document.documentDate) {
			possessionDate = possessionDate ?? document.documentDate
			facts.push({
				key: 'possessionDate',
				label: 'Possession date',
				displayValue: document.documentDate,
				asOfDate: document.documentDate,
				sourceDocumentId: document.chronicleDocumentId,
				confidence: 'high',
			})
		}

		if (document.typeId === 'registration' && document.documentDate) {
			registrationDate = registrationDate ?? document.documentDate
			facts.push({
				key: 'registrationDate',
				label: 'Registration date',
				displayValue: document.documentDate,
				asOfDate: document.documentDate,
				sourceDocumentId: document.chronicleDocumentId,
				confidence: 'high',
			})
		}

		if (document.typeId === 'home-loan') {
			facts.push({
				key: 'homeLoanLinked',
				label: 'Home loan linked',
				displayValue: 'Yes',
				asOfDate: document.documentDate,
				sourceDocumentId: document.chronicleDocumentId,
				confidence: 'medium',
			})
			references.push({
				kind: 'finance_loan',
				targetId: document.linkedFinanceLoanId ?? document.chronicleDocumentId,
				label: 'Home loan document on file',
				evidenceDocumentId: document.chronicleDocumentId,
			})
		}

		if (document.typeId === 'property-insurance') {
			facts.push({
				key: 'insuranceLinked',
				label: 'Property insurance linked',
				displayValue: 'Yes',
				asOfDate: document.documentDate,
				sourceDocumentId: document.chronicleDocumentId,
				confidence: 'medium',
			})
			references.push({
				kind: 'insurance_policy',
				targetId:
					document.linkedInsurancePolicyId ?? document.chronicleDocumentId,
				label: 'Property insurance document on file',
				evidenceDocumentId: document.chronicleDocumentId,
			})
		}
	}

	const propertyType = input.property.propertyType
	facts.push({
		key: 'propertyType',
		label: 'Property type',
		displayValue: input.property.propertyTypeLabel,
		asOfDate: null,
		sourceDocumentId: input.property.sourceDocumentIds[0] ?? '',
		confidence: propertyType === 'other' ? 'low' : 'medium',
	})

	if (input.property.city) {
		facts.push({
			key: 'city',
			label: 'City',
			displayValue: input.property.city,
			asOfDate: null,
			sourceDocumentId: input.property.sourceDocumentIds[0] ?? '',
			confidence: 'medium',
		})
	}

	return {
		...input.property,
		purchaseDate,
		possessionDate,
		registrationDate,
		facts,
		references,
	}
}

function buildTimelineEvents(input: {
	properties: PropertyRecord[]
	documents: PropertyDocumentRecord[]
}): PropertyTimelineEvent[] {
	const events: PropertyTimelineEvent[] = []

	for (const document of input.documents) {
		const eventDate = document.documentDate ?? document.uploadedAt

		switch (document.typeId) {
			case 'purchase-sale':
				events.push({
					id: `purchase-${document.chronicleDocumentId}`,
					propertyId: document.propertyId,
					documentId: document.chronicleDocumentId,
					eventType: 'property_purchased',
					title: 'Property purchased',
					eventDate,
					evidenceIds: [document.chronicleDocumentId],
				})
				break
			case 'registration':
				events.push({
					id: `registration-${document.chronicleDocumentId}`,
					propertyId: document.propertyId,
					documentId: document.chronicleDocumentId,
					eventType: 'registration_completed',
					title: 'Registration completed',
					eventDate,
					evidenceIds: [document.chronicleDocumentId],
				})
				break
			case 'possession':
				events.push({
					id: `possession-${document.chronicleDocumentId}`,
					propertyId: document.propertyId,
					documentId: document.chronicleDocumentId,
					eventType: 'possession_received',
					title: 'Possession received',
					eventDate,
					evidenceIds: [document.chronicleDocumentId],
				})
				break
			case 'property-tax':
				events.push({
					id: `tax-${document.chronicleDocumentId}`,
					propertyId: document.propertyId,
					documentId: document.chronicleDocumentId,
					eventType: 'property_tax_recorded',
					title: 'Property tax recorded',
					eventDate,
					evidenceIds: [document.chronicleDocumentId],
				})
				break
			case 'property-insurance':
				events.push({
					id: `insurance-${document.chronicleDocumentId}`,
					propertyId: document.propertyId,
					documentId: document.chronicleDocumentId,
					eventType: 'insurance_renewed',
					title: 'Property insurance recorded',
					eventDate,
					evidenceIds: [document.chronicleDocumentId],
				})
				break
			case 'renovation':
				events.push({
					id: `renovation-${document.chronicleDocumentId}`,
					propertyId: document.propertyId,
					documentId: document.chronicleDocumentId,
					eventType: 'renovation_recorded',
					title: 'Renovation recorded',
					eventDate,
					evidenceIds: [document.chronicleDocumentId],
				})
				break
			case 'home-loan':
				events.push({
					id: `loan-${document.chronicleDocumentId}`,
					propertyId: document.propertyId,
					documentId: document.chronicleDocumentId,
					eventType: 'home_loan_linked',
					title: 'Home loan linked',
					eventDate,
					evidenceIds: [document.chronicleDocumentId],
				})
				break
			default:
				break
		}
	}

	return events.sort((left, right) =>
		right.eventDate.localeCompare(left.eventDate),
	)
}

function resolveSetupStatus(input: {
	hasFolderAssigned: boolean
	documents: ChronicleDocument[]
	isOrganizing: boolean
}): PropertySetupStatus {
	if (!input.hasFolderAssigned) {
		return 'not_connected'
	}

	if (input.documents.length === 0) {
		return 'empty'
	}

	if (input.isOrganizing) {
		return 'organizing'
	}

	return 'ready'
}

export function buildPropertyKnowledge(input: {
	userId: string
	documents: ChronicleDocument[]
	members: FamilyMemberWithAliases[]
	hasFolderAssigned: boolean
	rootFolderPath?: string | null
	selectedMemberId?: string | null
}): PropertyKnowledge {
	const propertyDocuments = input.documents.filter(
		(document) =>
			document.category_id === 'property' && document.status !== 'failed',
	)
	const isOrganizing = propertyDocuments.some(
		(document) => document.status === 'processing',
	)
	const setupStatus = resolveSetupStatus({
		hasFolderAssigned: input.hasFolderAssigned,
		documents: propertyDocuments,
		isOrganizing,
	})

	if (!input.hasFolderAssigned) {
		return {
			userId: input.userId,
			setupStatus,
			hasFolderAssigned: false,
			hasProperties: false,
			hasDocuments: false,
			isOrganizing: false,
			properties: [],
			documents: [],
			attention: [],
			timeline: [],
			summary: {
				headline: 'Connect your Home folder',
				subline: 'Organize property records in one calm place',
				propertyCount: 0,
				documentCount: 0,
			},
			limitations: [],
		}
	}

	const candidates = buildPropertyCandidates({
		documents: propertyDocuments,
		rootFolderPath: input.rootFolderPath,
	})
	const documentRecords = propertyDocuments.map((document) => {
		const folderPath = resolveFolderPath(document)
		const displayName = resolvePropertyNameFromPath({
			folderPath,
			rootFolderPath: input.rootFolderPath,
		})

		return buildDocumentRecord({
			document,
			propertyId: slugifyPropertyName(displayName),
			members: input.members,
		})
	})

	const properties = candidates.map((candidate) => {
		const propertyType = inferPropertyTypeId({
			displayName: candidate.displayName,
			folderPath: candidate.folderPaths[0] ?? null,
		})
		const ownership = resolveOwnershipFromEvidence({
			ownerMemberIds: candidate.ownerMemberIds,
			members: input.members,
			explicitOwnership: propertyDocuments
				.filter((document) => candidate.documentIds.includes(document.id))
				.map(readExplicitOwnership)
				.find(Boolean),
		})
		const ownerNames = candidate.ownerMemberIds.map((memberId) =>
			resolveMemberName(memberId, input.members),
		)

		const stub = createPropertyRecordStub({
			candidate,
			propertyType,
			propertyTypeLabel: getPropertyTypeDefinition(propertyType).label,
			ownership,
			ownerNames,
			city: inferCityFromPropertyName(candidate.displayName),
		})

		return applyFactsFromDocuments({
			property: stub,
			documents: documentRecords,
		})
	})

	const scopedProperties = input.selectedMemberId
		? properties.filter((property) =>
				property.ownerMemberIds.includes(input.selectedMemberId!),
			)
		: properties

	const scopedDocuments = input.selectedMemberId
		? documentRecords.filter(
				(document) =>
					!document.ownerMemberId ||
					document.ownerMemberId === input.selectedMemberId,
			)
		: documentRecords

	const attention = buildPropertyAttentionItems({
		properties: scopedProperties,
		documents: scopedDocuments,
	})
	const timeline = buildTimelineEvents({
		properties: scopedProperties,
		documents: scopedDocuments,
	})

	return {
		userId: input.userId,
		setupStatus,
		hasFolderAssigned: input.hasFolderAssigned,
		hasProperties: scopedProperties.length > 0,
		hasDocuments: scopedDocuments.length > 0,
		isOrganizing,
		properties: scopedProperties,
		documents: scopedDocuments,
		attention,
		timeline,
		summary: {
			headline:
				scopedProperties.length === 1
					? scopedProperties[0]!.displayName
					: `${scopedProperties.length} properties organized`,
			subline:
				scopedDocuments.length > 0
					? `${scopedDocuments.length} property document${scopedDocuments.length === 1 ? '' : 's'} on file`
					: 'Your property records are here. Chronicle is still organizing them.',
			propertyCount: scopedProperties.length,
			documentCount: scopedDocuments.length,
		},
		limitations: scopedProperties.some(
			(property) => property.resolutionState !== 'resolved',
		)
			? ['Some property details are still missing.']
			: [],
	}
}

export function buildPropertyHomeViewModel(input: {
	knowledge: PropertyKnowledge
}): PropertyHomeViewModel {
	const { knowledge } = input

	return {
		setupStatus: knowledge.setupStatus,
		statusHeadline:
			knowledge.setupStatus === 'not_connected'
				? 'Connect your Home folder to organize your property records.'
				: knowledge.summary.headline,
		statusSubline: knowledge.summary.subline,
		propertyCards: knowledge.properties.map((property) => ({
			id: property.id,
			slug: property.slug,
			displayName: property.displayName,
			propertyTypeLabel: property.propertyTypeLabel,
			city: property.city,
			ownershipLabel: formatOwnershipLabel({
				ownership: property.ownership,
				ownerNames: property.ownerNames,
			}),
			documentCount: property.documentCount,
			attentionCount: knowledge.attention.filter(
				(item) => item.propertyId === property.id,
			).length,
		})),
		attentionItems: knowledge.attention,
		recentActivity: knowledge.timeline.slice(0, 3),
		askSuggestions: [
			'What properties do I have?',
			'When did I buy my Pune home?',
			'What property documents are missing?',
		],
		showLibraryLink: knowledge.hasDocuments,
		showHistoryLink: knowledge.timeline.length > 0,
	}
}

export function filterPropertyKnowledgeForMember(
	knowledge: PropertyKnowledge,
	memberId: string | null,
): PropertyKnowledge {
	if (!memberId) {
		return knowledge
	}

	const properties = knowledge.properties.filter(
		(property) =>
			property.ownerMemberIds.length === 0 ||
			property.ownerMemberIds.includes(memberId),
	)
	const propertyIds = new Set(properties.map((property) => property.id))
	const documents = knowledge.documents.filter(
		(document) =>
			propertyIds.has(document.propertyId) &&
			(!document.ownerMemberId || document.ownerMemberId === memberId),
	)
	const attention = buildPropertyAttentionItems({ properties, documents })
	const timeline = buildTimelineEvents({ properties, documents })

	return {
		...knowledge,
		properties,
		documents,
		attention,
		timeline,
		hasProperties: properties.length > 0,
		hasDocuments: documents.length > 0,
		summary: {
			...knowledge.summary,
			propertyCount: properties.length,
			documentCount: documents.length,
		},
	}
}
