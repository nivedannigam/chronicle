/** Canonical Chronicle Knowledge Graph entity types — domain-agnostic. */
export type ChronicleEntityType =
	| 'Person'
	| 'FamilyMember'
	| 'HealthReport'
	| 'HealthMetric'
	| 'HealthCategory'
	| 'Document'
	| 'InsurancePolicy'
	| 'Property'
	| 'Vehicle'
	| 'BankAccount'
	| 'Investment'
	| 'Trip'
	| 'Flight'
	| 'Hotel'
	| 'Visa'
	| 'Passport'
	| 'Task'
	| 'Email'
	| 'CalendarEvent'
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
