import { describe, expect, it } from 'vitest'
import {
	propertyDetailPath,
	propertyDocumentPath,
	propertyAskPath,
	ROUTES,
} from '@/constants/routes'
import { getLifeModuleById, MODULE_ROUTES } from '@/constants/modules'
import { resolveDocumentModuleDetailPath } from '@/features/documents/services/document-module-links.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import {
	buildPropertyHomeViewModel,
	buildPropertyKnowledge,
} from '@/features/property-knowledge'
import { buildPropertyDetailViewModel } from '@/features/property/services/property-detail.mapper'
import { propertyIntelligenceProvider } from '@/features/property/providers/property-intelligence.provider'
import { propertyTimelineProvider } from '@/features/timeline/providers/property-timeline.provider'
import { assignPropertySourceFolder } from '@/features/property/services/property-sources.service'

function makePropertyDocument(input: {
	id: string
	fileName: string
	folderPath: string
	subCategoryId?: string | null
	title?: string
	familyMemberId?: string | null
	issueDate?: string | null
}): ChronicleDocument {
	return {
		id: input.id,
		user_id: 'user-1',
		title: input.title ?? input.fileName,
		file_name: input.fileName,
		category_id: 'property',
		sub_category_id: input.subCategoryId ?? null,
		status: 'active',
		family_member_id: input.familyMemberId ?? null,
		issue_date: input.issueDate ?? null,
		expiry_date: null,
		document_number: null,
		uploaded_at: '2026-06-01T00:00:00.000Z',
		extracted_metadata: { folderPath: input.folderPath },
		extracted_text: null,
		knowledge_refs: [],
		mime_type: 'application/pdf',
	} as ChronicleDocument
}

const MEMBERS = [
	{
		id: 'member-nivedan',
		userId: 'user-1',
		familyId: null,
		displayName: 'Nivedan',
		relationship: 'self',
		isAccountOwner: true,
		roleId: 'adult' as const,
		dateOfBirth: null,
		gender: null,
		status: 'active' as const,
		avatarUrl: null,
		sortOrder: 0,
		aliases: [],
		createdAt: '',
		updatedAt: '',
	},
]

describe('Property module completion', () => {
	it('registers canonical module routes', () => {
		expect(getLifeModuleById('property')?.route).toBe(ROUTES.property)
		expect(MODULE_ROUTES.property).toBe(ROUTES.property)
		expect(propertyDetailPath('pune-home')).toBe('/property/pune-home')
		expect(propertyDocumentPath('doc-1')).toBe('/property/documents/doc-1')
		expect(propertyAskPath({ q: 'When did I buy my Pune home?' })).toContain(
			'context=property',
		)
	})

	it('builds Property Home view model from knowledge', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [
				makePropertyDocument({
					id: 'doc-1',
					fileName: 'deed.pdf',
					folderPath: 'Home/Pune Home/Registration/deed.pdf',
					subCategoryId: 'registration',
					issueDate: '2019-03-15',
				}),
			],
			members: MEMBERS,
			hasFolderAssigned: true,
			rootFolderPath: 'Home',
		})

		const home = buildPropertyHomeViewModel({ knowledge })

		expect(home.propertyCards).toHaveLength(1)
		expect(home.propertyCards[0]?.displayName).toBe('Pune Home')
		expect(home.showLibraryLink).toBe(true)
	})

	it('builds Property detail with linked sections', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [
				makePropertyDocument({
					id: 'doc-1',
					fileName: 'deed.pdf',
					folderPath: 'Home/Pune Home/Registration/deed.pdf',
					subCategoryId: 'registration',
					issueDate: '2019-03-15',
				}),
				makePropertyDocument({
					id: 'doc-2',
					fileName: 'tax.pdf',
					folderPath: 'Home/Pune Home/Property Tax/tax.pdf',
					subCategoryId: 'property-tax',
					issueDate: '2026-03-01',
				}),
			],
			members: MEMBERS,
			hasFolderAssigned: true,
			rootFolderPath: 'Home',
		})

		const property = knowledge.properties[0]!
		const detail = buildPropertyDetailViewModel({
			knowledge,
			propertySlug: property.slug,
		})

		expect(detail?.displayName).toBe('Pune Home')
		expect(detail?.documents.length).toBeGreaterThan(0)
		expect(detail?.history.length).toBeGreaterThan(0)
	})

	it('indexes Property entities in universal Search', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [
				makePropertyDocument({
					id: 'doc-1',
					fileName: 'deed.pdf',
					folderPath: 'Home/Pune Home/Registration/deed.pdf',
					subCategoryId: 'registration',
				}),
			],
			members: MEMBERS,
			hasFolderAssigned: true,
			rootFolderPath: 'Home',
		})

		const hits = propertyIntelligenceProvider.search({
			userId: 'user-1',
			question: 'Pune',
			resolvedQuestion: 'Pune',
			intent: 'timeline_search',
			member: { memberId: null, memberName: null, familyMemberNames: [] },
			searchHits: [],
			sources: { property: { knowledge } },
		})

		expect(hits.some((hit) => hit.snippet === 'Property · Pune Home')).toBe(
			true,
		)
	})

	it('finds property tax documents in Search with Module · Entity pattern', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [
				makePropertyDocument({
					id: 'doc-tax',
					fileName: 'tax.pdf',
					folderPath: 'Home/Pune Home/Property Tax/tax.pdf',
					subCategoryId: 'property-tax',
					title: 'Property Tax 2026',
				}),
			],
			members: MEMBERS,
			hasFolderAssigned: true,
			rootFolderPath: 'Home',
		})

		const hits = propertyIntelligenceProvider.search({
			userId: 'user-1',
			question: 'property tax',
			resolvedQuestion: 'property tax',
			intent: 'timeline_search',
			member: { memberId: null, memberName: null, familyMemberNames: [] },
			searchHits: [],
			sources: { property: { knowledge } },
		})

		expect(hits.some((hit) => hit.snippet.includes('Property ·'))).toBe(true)
	})

	it('maps meaningful property events to global Timeline', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [
				makePropertyDocument({
					id: 'doc-1',
					fileName: 'deed.pdf',
					folderPath: 'Home/Pune Home/Registration/deed.pdf',
					subCategoryId: 'registration',
					issueDate: '2019-03-15',
				}),
			],
			members: MEMBERS,
			hasFolderAssigned: true,
			rootFolderPath: 'Home',
		})

		const events = propertyTimelineProvider.getEvents({
			userId: 'user-1',
			memberId: null,
			memberName: null,
			sources: { property: { knowledge } },
		})

		expect(events.length).toBeGreaterThan(0)
		expect(events[0]?.sourceModule).toBe('property')
		expect(events[0]?.category).toBe('life')
		expect(events[0]?.title).not.toMatch(/uploaded|processed|extraction/i)
	})

	it('links Library property documents back to Property detail', () => {
		const document = makePropertyDocument({
			id: 'doc-1',
			fileName: 'deed.pdf',
			folderPath: 'Home/Pune Home/Registration/deed.pdf',
			subCategoryId: 'registration',
		})

		const link = resolveDocumentModuleDetailPath(document)

		expect(link?.label).toBe('View property')
		expect(link?.path).toContain('/property/')
	})

	it('scopes property visibility by family member without changing ownership', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [
				makePropertyDocument({
					id: 'doc-1',
					fileName: 'deed.pdf',
					folderPath: 'Home/Pune Home/Registration/deed.pdf',
					familyMemberId: 'member-nivedan',
				}),
			],
			members: MEMBERS,
			hasFolderAssigned: true,
			rootFolderPath: 'Home',
			selectedMemberId: 'member-other',
		})

		expect(knowledge.properties).toHaveLength(0)
	})

	it('uses consumer empty-state copy when folder is not connected', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [],
			members: MEMBERS,
			hasFolderAssigned: false,
		})
		const home = buildPropertyHomeViewModel({ knowledge })

		expect(home.statusHeadline).toContain('Connect your Home folder')
		expect(home.statusHeadline).not.toMatch(/parser|OCR|pipeline/i)
	})

	it('assigns property module folders under ChronicleModuleId property', async () => {
		const assignments = await assignPropertySourceFolder({
			userId: 'property-module-user',
			externalFolderId: 'folder-home',
			folderName: 'Home',
			folderPath: 'Home',
			familyMemberId: 'member-nivedan',
			familyMemberName: 'Nivedan',
			memberLabel: 'Nivedan',
			mode: 'replace',
		})

		expect(assignments[0]?.folderName).toBe('Home')
	})

	it('prevents duplicate property entities from the same slug', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [
				makePropertyDocument({
					id: 'doc-1',
					fileName: 'a.pdf',
					folderPath: 'Home/Pune Home/Tax/a.pdf',
				}),
				makePropertyDocument({
					id: 'doc-2',
					fileName: 'b.pdf',
					folderPath: 'Home/Pune Home/Registration/b.pdf',
				}),
			],
			members: MEMBERS,
			hasFolderAssigned: true,
			rootFolderPath: 'Home',
		})

		const slugs = knowledge.properties.map((property) => property.slug)
		expect(new Set(slugs).size).toBe(slugs.length)
	})
})
