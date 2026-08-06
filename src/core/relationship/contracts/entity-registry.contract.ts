import type { GraphDomainAdapter } from '@/shared/knowledge-graph/contracts/graph-domain-adapter.contract'
import type {
	ChronicleEntityType,
	ChronicleDomain,
} from '@/shared/knowledge-graph/types/entity.types'

export type { GraphDomainAdapter }

export interface DomainEntityRegistration {
	domain: ChronicleDomain
	providerId: string
	entityTypes: ChronicleEntityType[]
}

export interface EntityResolveInput {
	domain: ChronicleDomain
	entityType: string
	rawId: string
	memberId?: string | null
	userId?: string
}

export interface ResolvedEntityRef {
	id: string
	type: ChronicleEntityType
	label?: string
}
