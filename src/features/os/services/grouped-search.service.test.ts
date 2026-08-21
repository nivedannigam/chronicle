import { describe, expect, it } from 'vitest'
import { groupSearchResults } from '@/features/os/services/grouped-search.service'

const members = [
	{
		id: 'member-advika',
		userId: 'user-1',
		familyId: 'family-1',
		displayName: 'Advika',
		relationship: 'Daughter',
		isAccountOwner: false,
		roleId: 'member' as const,
		dateOfBirth: null,
		gender: null,
		status: 'active' as const,
		avatarUrl: null,
		sortOrder: 2,
		aliases: [],
		createdAt: '',
		updatedAt: '',
	},
	{
		id: 'member-nivedan',
		userId: 'user-1',
		familyId: 'family-1',
		displayName: 'Nivedan',
		relationship: 'Self',
		isAccountOwner: true,
		roleId: 'owner' as const,
		dateOfBirth: null,
		gender: null,
		status: 'active' as const,
		avatarUrl: null,
		sortOrder: 1,
		aliases: [],
		createdAt: '',
		updatedAt: '',
	},
]

describe('buildSearchResultContextLabel', () => {
	it('labels identity documents with module and owner', () => {
		const sections = groupSearchResults({
			query: 'passport',
			members,
			hits: [
				{
					id: 'doc-1',
					domain: 'documents',
					kind: 'report',
					title: 'Passport',
					snippet: '',
					score: 1,
					reportType: 'identity',
					memberId: 'member-advika',
				},
			],
		})

		expect(sections[0]?.results[0]?.subtitle).toBe('Identity · Advika')
	})

	it('labels health reports with member name', () => {
		const sections = groupSearchResults({
			query: 'blood',
			members,
			hits: [
				{
					id: 'report-1',
					domain: 'health',
					kind: 'report',
					title: 'Blood Report',
					snippet: '',
					score: 1,
					memberId: 'member-nivedan',
				},
			],
		})

		expect(sections[0]?.results[0]?.subtitle).toBe('Health · Nivedan')
	})

	it('labels vehicle entities with vehicle name', () => {
		const sections = groupSearchResults({
			query: 'xev',
			members,
			hits: [
				{
					id: 'vehicle-1',
					domain: 'vehicles',
					kind: 'entity',
					title: 'XEV 9e',
					snippet: 'Registration MH12AB1234',
					score: 1,
				},
			],
		})

		expect(sections[0]?.results[0]?.subtitle).toBe('Vehicles · XEV 9e')
	})

	it('labels identity provider hits with module and owner', () => {
		const sections = groupSearchResults({
			query: 'passport',
			members,
			hits: [
				{
					id: 'identity-doc-1',
					domain: 'identity',
					kind: 'report',
					title: 'Passport',
					snippet: 'Identity · Advika',
					score: 1,
					reportId: 'doc-1',
					memberId: 'member-advika',
				},
			],
		})

		expect(sections[0]?.results[0]?.subtitle).toBe('Identity · Advika')
		expect(sections[0]?.results[0]?.path).toBe('/identity/documents/doc-1')
	})
})

describe('groupSearchResults', () => {
	it('uses module · entity context as result subtitle', () => {
		const sections = groupSearchResults({
			query: 'passport',
			members,
			hits: [
				{
					id: 'doc-1',
					domain: 'documents',
					kind: 'report',
					title: 'Passport',
					snippet: 'Passport · N1234567',
					score: 1,
					reportId: 'doc-1',
					reportType: 'identity',
					memberId: 'member-advika',
				},
			],
		})

		expect(sections[0]?.results[0]?.subtitle).toBe('Identity · Advika')
	})
})
