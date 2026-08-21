import type { PropertyDocumentTypeId } from '@/features/property-knowledge/services/property-type.registry'

export type PropertySetupStatus =
	'not_connected' | 'scanning' | 'organizing' | 'empty' | 'ready'

export type PropertyTypeId =
	'apartment' | 'house' | 'villa' | 'plot' | 'commercial' | 'other'

export type PropertyOwnership = 'individual' | 'joint' | 'family' | 'unknown'

export type PropertyStatus = 'active' | 'sold' | 'rented' | 'unknown'

export type PropertyResolutionState = 'resolved' | 'ambiguous' | 'unresolved'

export type PropertyFactConfidence = 'high' | 'medium' | 'low'

export type PropertyFactKey =
	| 'purchaseDate'
	| 'possessionDate'
	| 'registrationDate'
	| 'propertyType'
	| 'ownership'
	| 'area'
	| 'address'
	| 'city'
	| 'societyName'
	| 'propertyTaxStatus'
	| 'homeLoanLinked'
	| 'insuranceLinked'

export interface PropertyFact {
	key: PropertyFactKey
	label: string
	displayValue: string
	asOfDate: string | null
	sourceDocumentId: string
	confidence: PropertyFactConfidence
}

export interface PropertyCrossModuleReference {
	kind: 'insurance_policy' | 'finance_loan' | 'family_member' | 'document'
	targetId: string
	label: string
	evidenceDocumentId: string | null
}

export interface PropertyDocumentRecord {
	id: string
	chronicleDocumentId: string
	propertyId: string
	typeId: PropertyDocumentTypeId
	typeLabel: string
	title: string
	fileName: string
	ownerMemberId: string | null
	ownerName: string
	documentDate: string | null
	expiryDate: string | null
	registrationNumber: string | null
	maskedRegistrationNumber: string | null
	consumerStatus: 'ready' | 'organizing' | 'needs_help'
	classificationConfidence: 'high' | 'medium' | 'low'
	uploadedAt: string
	folderPath: string | null
	summary: string
	/** Reference-only — does not create Finance entities. */
	linkedFinanceLoanId: string | null
	/** Reference-only — does not create Insurance policies. */
	linkedInsurancePolicyId: string | null
}

export interface PropertyRecord {
	id: string
	slug: string
	displayName: string
	propertyType: PropertyTypeId
	propertyTypeLabel: string
	address: string | null
	city: string | null
	ownership: PropertyOwnership
	ownerMemberIds: string[]
	ownerNames: string[]
	purchaseDate: string | null
	possessionDate: string | null
	registrationDate: string | null
	societyName: string | null
	status: PropertyStatus
	documentCount: number
	facts: PropertyFact[]
	references: PropertyCrossModuleReference[]
	sourceDocumentIds: string[]
	resolutionState: PropertyResolutionState
}

export interface PropertyAttentionItem {
	id: string
	propertyId: string
	documentId: string | null
	headline: string
	subline: string
	severity: 'high' | 'medium' | 'low'
	reason:
		| 'property_tax_due'
		| 'insurance_missing'
		| 'insurance_expiring'
		| 'document_missing'
		| 'ownership_unresolved'
		| 'registration_incomplete'
	evidenceDocumentIds: string[]
}

export interface PropertyTimelineEvent {
	id: string
	propertyId: string
	documentId: string | null
	eventType:
		| 'property_purchased'
		| 'registration_completed'
		| 'possession_received'
		| 'property_tax_recorded'
		| 'insurance_renewed'
		| 'renovation_recorded'
		| 'home_loan_linked'
		| 'document_added'
	title: string
	eventDate: string
	evidenceIds: string[]
}

export interface PropertyKnowledgeSummary {
	headline: string
	subline: string
	propertyCount: number
	documentCount: number
}

export interface PropertyKnowledge {
	userId: string
	setupStatus: PropertySetupStatus
	hasFolderAssigned: boolean
	hasProperties: boolean
	hasDocuments: boolean
	isOrganizing: boolean
	properties: PropertyRecord[]
	documents: PropertyDocumentRecord[]
	attention: PropertyAttentionItem[]
	timeline: PropertyTimelineEvent[]
	summary: PropertyKnowledgeSummary
	limitations: string[]
}

export interface PropertyHomeViewModel {
	setupStatus: PropertySetupStatus
	statusHeadline: string
	statusSubline: string
	propertyCards: Array<{
		id: string
		slug: string
		displayName: string
		propertyTypeLabel: string
		city: string | null
		ownershipLabel: string
		documentCount: number
		attentionCount: number
	}>
	attentionItems: PropertyAttentionItem[]
	recentActivity: PropertyTimelineEvent[]
	askSuggestions: string[]
	showLibraryLink: boolean
	showHistoryLink: boolean
}
