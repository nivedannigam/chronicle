import { describe, expect, it } from 'vitest'
import {
	matchMotorPoliciesToVehicle,
	pickLatestLinkedMotorPolicy,
} from '@/features/vehicle-knowledge/services/vehicle-insurance-linkage.service'

describe('vehicle insurance linkage', () => {
	it('matches motor policies by vehicle model tokens', () => {
		const matches = matchMotorPoliciesToVehicle(
			{
				displayName: 'XEV 9e',
				make: 'MG',
				model: 'XEV 9e',
				variant: null,
			},
			[
				{
					policyId: 'p1',
					productName: 'Reliance Private Car Policy - Bundled',
					expiryDate: '2028-03-18',
					insurerId: 'reliance',
					sourceLabels: [],
				},
				{
					policyId: 'p2',
					productName:
						'IndusInd Private Car Policy-Stand-alone Own Damage Policy',
					expiryDate: '2027-03-18',
					insurerId: 'indusind',
					sourceLabels: [],
				},
			],
		)

		expect(matches).toHaveLength(0)
	})

	it('matches when source document label contains vehicle display name', () => {
		const matches = matchMotorPoliciesToVehicle(
			{
				displayName: 'XEV 9e',
				make: 'MG',
				model: 'XEV 9e',
				variant: null,
			},
			[
				{
					policyId: 'p1',
					productName: 'Reliance Private Car Policy - Bundled',
					expiryDate: '2028-03-18',
					insurerId: 'reliance',
					sourceLabels: ['Reliance - XEV 9E Insurance.pdf'],
				},
			],
		)

		expect(matches).toHaveLength(1)
		expect(matches[0]?.policyId).toBe('p1')
	})

	it('picks the latest linked motor policy expiry', () => {
		const latest = pickLatestLinkedMotorPolicy([
			{
				policyId: 'p1',
				productName: 'Policy A',
				expiryDate: '2027-03-18',
				insurerId: 'a',
				sourceLabels: [],
			},
			{
				policyId: 'p2',
				productName: 'Policy B',
				expiryDate: '2028-03-18',
				insurerId: 'b',
				sourceLabels: [],
			},
		])

		expect(latest?.policyId).toBe('p2')
	})
})
