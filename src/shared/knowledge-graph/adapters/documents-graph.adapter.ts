import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { resolveDocumentModuleLinks } from '@/features/documents/services/document-module-links.service'
import type { GraphDomainAdapter } from '@/shared/knowledge-graph/contracts/graph-domain-adapter.contract'
import type { GraphStore } from '@/shared/knowledge-graph/store/graph-store'
import {
	entityId,
	relationshipId,
} from '@/shared/knowledge-graph/utils/graph-id.utils'

export interface DocumentsGraphInput {
	documents: ChronicleDocument[]
}

function moduleToDomain(
	moduleId: string,
): import('@/shared/knowledge-graph/types/entity.types').ChronicleDomain {
	switch (moduleId) {
		case 'health':
			return 'health'
		case 'insurance':
			return 'insurance'
		case 'finance':
			return 'finance'
		case 'travel':
			return 'travel'
		default:
			return 'documents'
	}
}

export function ingestDocuments(
	store: GraphStore,
	input: DocumentsGraphInput,
): { entityCount: number; relationshipCount: number } {
	const before = store.snapshot()

	for (const document of input.documents) {
		if (document.status === 'failed') {
			continue
		}

		const docEntityId = entityId('document', document.id)

		store.upsertEntity({
			id: docEntityId,
			type: 'Document',
			label: document.title,
			domain: 'documents',
			sourceProvider: 'documents',
			memberId: document.family_member_id,
			createdAt: document.uploaded_at,
			updatedAt: document.updated_at,
			metadata: {
				categoryId: document.category_id,
				subCategoryId: document.sub_category_id,
				fileName: document.file_name,
				expiryDate: document.expiry_date,
				issuer: document.issuer,
				documentNumber: document.document_number,
			},
		})

		if (document.family_member_id) {
			const memberEntityId = entityId(
				'family-member',
				document.family_member_id,
			)

			if (store.getEntity(memberEntityId)) {
				store.upsertRelationship({
					id: relationshipId('belongs_to', docEntityId, memberEntityId),
					type: 'belongs_to',
					fromEntityId: docEntityId,
					toEntityId: memberEntityId,
					label: 'belongs to',
					domain: 'documents',
					sourceProvider: 'documents',
				})
			}
		}

		for (const ref of document.knowledge_refs) {
			const targetId = entityId(ref.domain, ref.entityId)

			if (store.getEntity(targetId)) {
				store.upsertRelationship({
					id: relationshipId('references', docEntityId, targetId),
					type: 'references',
					fromEntityId: docEntityId,
					toEntityId: targetId,
					label: ref.label,
					domain: moduleToDomain(ref.domain),
					sourceProvider: 'documents',
				})
			}
		}

		for (const link of resolveDocumentModuleLinks(document)) {
			store.upsertRelationship({
				id: relationshipId('used_by', docEntityId, link.moduleId),
				type: 'used_by',
				fromEntityId: docEntityId,
				toEntityId: entityId('module', link.moduleId),
				label: `used by ${link.label}`,
				domain: moduleToDomain(link.moduleId),
				sourceProvider: 'documents',
				metadata: { moduleId: link.moduleId, route: link.route },
			})
		}

		if (document.category_id === 'vehicles') {
			const assetId = entityId('asset', document.id)
			store.upsertEntity({
				id: assetId,
				type: 'Asset',
				label: document.title,
				domain: 'documents',
				sourceProvider: 'documents',
				memberId: document.family_member_id,
				metadata: { assetKind: 'vehicle', documentId: document.id },
			})

			store.upsertRelationship({
				id: relationshipId('created_from', assetId, docEntityId),
				type: 'created_from',
				fromEntityId: assetId,
				toEntityId: docEntityId,
				label: 'created from document',
				domain: 'documents',
				sourceProvider: 'documents',
			})
		}
	}

	const after = store.snapshot()
	return {
		entityCount: after.entityCount - before.entityCount,
		relationshipCount: after.relationshipCount - before.relationshipCount,
	}
}

export const documentsGraphAdapter: GraphDomainAdapter<DocumentsGraphInput> = {
	domain: 'documents',
	providerId: 'documents',
	entityTypes: ['Document', 'Asset', 'Attachment'],
	ingest: ingestDocuments,
}
