import { describe, expect, it } from 'vitest'
import {
	buildFinanceHubCard,
	buildHealthHubCard,
	buildIdentityHubCard,
	buildInsuranceHubCard,
	buildPersonalHubCard,
	buildVehiclesHubCard,
	resolveModuleHubCardAction,
} from '@/features/modules/services/module-hub-status.service'
import { ROUTES } from '@/constants/routes'

describe('buildInsuranceHubCard', () => {
	it('shows setup when folder is not assigned', () => {
		const card = buildInsuranceHubCard({
			knowledge: null,
			setupStatus: 'assign_folder',
		})

		expect(card.state).toBe('setup_required')
		expect(card.statusLine).toBe('Connect your insurance folder')
		expect(card.actionLabel).toBe('Set up')
	})

	it('shows active policy summary when ready', () => {
		const card = buildInsuranceHubCard({
			knowledge: {
				summary: {
					headline: '4 policies · All up to date',
					lines: [],
					policyCount: 4,
					activePolicyCount: 4,
					expiringCount: 0,
					claimCount: 0,
					totalSumInsured: null,
					currency: 'INR',
				},
				policies: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
				activePolicies: [
					{ id: 'p1' },
					{ id: 'p2' },
					{ id: 'p3' },
					{ id: 'p4' },
				],
				expiringPolicies: [],
				lapsedPolicies: [],
				coverageGaps: [],
				claims: [],
				documents: [],
				protectionScore: 85,
			} as never,
			setupStatus: 'ready',
		})

		expect(card.state).toBe('active')
		expect(card.statusLine).toBe('4 policies · All up to date')
	})

	it('shows attention when renewals are coming up', () => {
		const card = buildInsuranceHubCard({
			knowledge: {
				summary: {
					headline: '1 policy needs renewal soon.',
					lines: [],
					policyCount: 2,
					activePolicyCount: 2,
					expiringCount: 1,
					claimCount: 0,
					totalSumInsured: null,
					currency: 'INR',
				},
				policies: [{ id: 'p1' }, { id: 'p2' }],
				activePolicies: [{ id: 'p1' }, { id: 'p2' }],
				expiringPolicies: [{ id: 'p1' }],
				lapsedPolicies: [],
				coverageGaps: [],
				claims: [],
				documents: [],
			} as never,
			setupStatus: 'ready',
		})

		expect(card.state).toBe('attention')
		expect(card.statusLine).toContain('renewal')
	})

	it('shows attention when protection status needs attention from lapsed policies', () => {
		const card = buildInsuranceHubCard({
			knowledge: {
				summary: {
					headline: '2 active policies — protection knowledge assembled.',
					lines: [],
					policyCount: 2,
					activePolicyCount: 2,
					expiringCount: 0,
					claimCount: 0,
					totalSumInsured: null,
					currency: 'INR',
				},
				policies: [{ id: 'p1' }, { id: 'p2' }],
				activePolicies: [{ id: 'p1' }],
				expiringPolicies: [],
				lapsedPolicies: [{ id: 'p2' }],
				coverageGaps: [],
				claims: [],
				documents: [],
				protectionScore: 80,
			} as never,
			setupStatus: 'ready',
		})

		expect(card.state).toBe('attention')
		expect(card.statusLine).toContain('attention')
	})
})

describe('buildFinanceHubCard', () => {
	it('shows attention when finance home has attention items', () => {
		const card = buildFinanceHubCard({
			setupStatus: 'ready',
			documentCount: 4,
			attentionCount: 2,
			statusHeadline: 'Your financial picture is taking shape',
		})

		expect(card.state).toBe('attention')
		expect(card.statusLine).toBe('2 items need attention')
	})

	it('uses finance home headline when no attention items remain', () => {
		const card = buildFinanceHubCard({
			setupStatus: 'ready',
			documentCount: 4,
			attentionCount: 0,
			statusHeadline: 'Your financial picture is taking shape',
		})

		expect(card.state).toBe('active')
		expect(card.statusLine).toBe('Your financial picture is taking shape')
	})
})

describe('buildIdentityHubCard', () => {
	it('shows setup when not connected', () => {
		const card = buildIdentityHubCard({
			setupStatus: 'not_connected',
			attentionCount: 0,
		})

		expect(card.state).toBe('setup_required')
		expect(card.statusLine).toBe('Connect your Identity folder')
	})

	it('shows attention count when documents need attention', () => {
		const card = buildIdentityHubCard({
			setupStatus: 'ready',
			attentionCount: 2,
		})

		expect(card.state).toBe('attention')
		expect(card.statusLine).toBe('2 documents need attention')
	})
})

describe('buildVehiclesHubCard', () => {
	it('shows setup when folder is missing', () => {
		const card = buildVehiclesHubCard({
			knowledge: null,
			hasFolderAssigned: false,
			isProcessing: false,
		})

		expect(card.state).toBe('setup_required')
		expect(card.statusLine).toBe('Connect your Vehicles folder')
	})

	it('shows vehicle name when one vehicle is ready', () => {
		const card = buildVehiclesHubCard({
			knowledge: {
				hasVehicles: true,
				vehicles: [{ displayName: 'XEV 9e' }],
				attention: [],
				summary: { headline: '', lines: [] },
			} as never,
			hasFolderAssigned: true,
			isProcessing: false,
		})

		expect(card.state).toBe('active')
		expect(card.statusLine).toBe('XEV 9e · All up to date')
	})
})

describe('buildHealthHubCard', () => {
	it('shows organizing while reports are processing', () => {
		const card = buildHealthHubCard({
			overallStatus: 'Good',
			hasReports: true,
			isOrganizing: true,
			hasFolderForMember: true,
			driveConnected: true,
		})

		expect(card.state).toBe('organizing')
	})

	it('shows positive status when health is good', () => {
		const card = buildHealthHubCard({
			overallStatus: 'Good',
			hasReports: true,
			isOrganizing: false,
			hasFolderForMember: true,
			driveConnected: true,
		})

		expect(card.state).toBe('active')
		expect(card.statusLine).toBe('All looking good')
	})
})

describe('resolveModuleHubCardAction', () => {
	it('routes setup-required modules to settings', () => {
		const card = buildIdentityHubCard({
			setupStatus: 'not_connected',
			attentionCount: 0,
		})

		expect(resolveModuleHubCardAction(card)).toEqual({
			path: ROUTES.identitySettings,
			isSetup: true,
		})
	})

	it('routes active modules to their home route', () => {
		const card = buildPersonalHubCard({ documentCount: 2 })

		expect(resolveModuleHubCardAction(card)).toEqual({
			path: ROUTES.personal,
			isSetup: false,
		})
	})
})
