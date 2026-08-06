/** Canonical Chronicle Knowledge Graph entity types — domain-agnostic. */
export type ChronicleEntityType =
	| 'Person'
	| 'FamilyMember'
	| 'HealthReport'
	| 'HealthMetric'
	| 'HealthCategory'
	| 'HealthVisit'
	| 'Document'
	| 'Attachment'
	| 'InsurancePolicy'
	| 'Claim'
	| 'Coverage'
	| 'Asset'
	| 'Property'
	| 'Vehicle'
	| 'BankAccount'
	| 'FinancialAccount'
	| 'Investment'
	| 'Employer'
	| 'Organization'
	| 'EducationalInstitution'
	| 'Trip'
	| 'Flight'
	| 'Hotel'
	| 'Visa'
	| 'Passport'
	| 'Location'
	| 'Task'
	| 'Note'
	| 'Email'
	| 'CalendarEvent'
	| 'Event'
	| 'Recommendation'
	| 'TimelineEvent'

export type ChronicleDomain =
	| 'health'
	| 'documents'
	| 'finance'
	| 'travel'
	| 'insurance'
	| 'family'
	| 'mail'
	| 'tasks'
	| 'core'

export interface ChronicleEntity {
	id: string
	type: ChronicleEntityType
	label: string
	domain: ChronicleDomain
	sourceProvider: string
	memberId?: string | null
	createdAt?: string
	updatedAt?: string
	metadata: Record<string, unknown>
}

export interface ChronicleEntityRef {
	id: string
	type: ChronicleEntityType
	label: string
}

export interface UpsertEntityInput {
	entity: ChronicleEntity
}

export interface FindEntityQuery {
	id?: string
	type?: ChronicleEntityType | ChronicleEntityType[]
	domain?: ChronicleDomain
	memberId?: string | null
	labelContains?: string
	limit?: number
}
