import { describe, expect, it } from 'vitest'
import {
	parseInsuranceExtractionJson,
	parseVehicleExtractionJson,
} from '@/shared/ai/prompt/extract-domain-document.parser'

describe('parseInsuranceExtractionJson', () => {
	it('parses structured insurance fields from AI JSON', () => {
		const parsed = parseInsuranceExtractionJson(
			JSON.stringify({
				insurer: 'ICICI Lombard',
				policyNumber: 'POL 123456',
				policyType: 'health',
				productName: 'Health Shield',
				inceptionDate: '2024-01-01',
				expiryDate: '2027-01-01',
				sumInsured: '25,00,000',
				premium: 18500,
				currency: 'INR',
				insuredMembers: ['Self', 'Spouse'],
				confidence: 0.91,
			}),
		)

		expect(parsed.insurer).toBe('ICICI Lombard')
		expect(parsed.policyNumber).toBe('POL 123456')
		expect(parsed.policyType).toBe('health')
		expect(parsed.sumInsured).toBe(2500000)
		expect(parsed.premium).toBe(18500)
		expect(parsed.insuredMembers).toEqual(['Self', 'Spouse'])
	})

	it('rejects invalid policy types and unknown fields safely', () => {
		const parsed = parseInsuranceExtractionJson(
			JSON.stringify({
				insurer: 'Unknown',
				policyNumber: 'X',
				policyType: 'invalid-type',
				sumInsured: 0,
			}),
		)

		expect(parsed.policyType).toBeNull()
		expect(parsed.sumInsured).toBe(0)
	})
})

describe('parseVehicleExtractionJson', () => {
	it('parses vehicle identity and facts from AI JSON', () => {
		const parsed = parseVehicleExtractionJson(
			JSON.stringify({
				documentType: 'insurance',
				registrationNumber: 'MH 12 AB 1234',
				vin: 'MA1XA2BC3D4567890',
				engineNumber: 'ENG123456',
				expiryDate: '2026-08-15',
				facts: [
					{
						factKey: 'insurance_provider',
						factValue: 'Tata AIG',
					},
					{
						factKey: 'policy_number',
						factValue: 'MTR-001',
					},
				],
				confidence: 0.88,
			}),
		)

		expect(parsed.documentType).toBe('insurance')
		expect(parsed.registrationNumber).toBe('MH 12 AB 1234')
		expect(parsed.vin).toBe('MA1XA2BC3D4567890')
		expect(parsed.facts).toHaveLength(2)
		expect(parsed.facts[0]?.factKey).toBe('insurance_provider')
	})
})
