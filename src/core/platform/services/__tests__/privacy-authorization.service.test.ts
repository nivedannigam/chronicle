import { describe, expect, it } from 'vitest'
import { buildQaFamilyMembers } from '@/qa/seed/build-qa-dataset'
import { QA_MEMBER_IDS } from '@/qa/qa-constants'
import {
	canViewerAccessResource,
	filterResourcesForMember,
	resolveAskAuthorization,
} from '@/core/platform/services/privacy-authorization.service'

describe('privacy-authorization.service', () => {
	const members = buildQaFamilyMembers()
	const accountOwnerMemberId = QA_MEMBER_IDS.nivedan

	it('blocks cross-member Ask while viewing a specific member', () => {
		const result = resolveAskAuthorization({
			question: "What is Priya's LDL?",
			viewerMemberId: QA_MEMBER_IDS.nivedan,
			viewerMemberName: 'Nivedan QA',
			members,
			accountOwnerMemberId,
		})

		expect(result.status).toBe('RESTRICTED')
		expect(result.retrievalMemberId).toBeNull()
	})

	it('allows self questions in member view', () => {
		const result = resolveAskAuthorization({
			question: 'What is my LDL?',
			viewerMemberId: QA_MEMBER_IDS.nivedan,
			viewerMemberName: 'Nivedan QA',
			members,
			accountOwnerMemberId,
		})

		expect(result.status).toBe('ALLOWED')
		expect(result.retrievalMemberId).toBe(QA_MEMBER_IDS.nivedan)
	})

	it('allows named member questions in All Family view', () => {
		const result = resolveAskAuthorization({
			question: "What is Priya's LDL?",
			viewerMemberId: null,
			viewerMemberName: null,
			members,
			accountOwnerMemberId,
		})

		expect(result.status).toBe('ALLOWED')
		expect(result.retrievalMemberId).toBe(QA_MEMBER_IDS.wife)
	})

	it('filters private resources for a selected member', () => {
		const filtered = filterResourcesForMember(
			[
				{ familyMemberId: QA_MEMBER_IDS.nivedan },
				{ familyMemberId: QA_MEMBER_IDS.wife },
				{ familyMemberId: null, privacyScope: 'shared' as const },
			],
			{
				viewerMemberId: QA_MEMBER_IDS.nivedan,
				accountOwnerMemberId,
			},
		)

		expect(filtered).toHaveLength(2)
	})

	it('allows shared resources for any member view', () => {
		expect(
			canViewerAccessResource(
				{ familyMemberId: null, privacyScope: 'shared' },
				{
					viewerMemberId: QA_MEMBER_IDS.daughter,
					accountOwnerMemberId,
				},
			),
		).toBe(true)
	})

	it('restricts account-level resources to account owner', () => {
		expect(
			canViewerAccessResource(
				{ familyMemberId: null },
				{
					viewerMemberId: QA_MEMBER_IDS.daughter,
					accountOwnerMemberId,
				},
			),
		).toBe(false)
	})
})
