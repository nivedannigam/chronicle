import { describe, expect, it } from 'vitest'
import {
	resolveFinanceDocumentClassification,
	resolveInsurancePolicyClassification,
	resolveVehicleDocumentClassification,
} from '@/features/document-intelligence/classification/resolve-domain-classification.service'

describe('domain classification precedence', () => {
	it('Insurance: content home policy wins over health folder and filename', () => {
		const resolved = resolveInsurancePolicyClassification({
			aiPolicyType: 'home',
			aiConfidence: 0.88,
			categoryHint: 'health',
			fileName: 'health-insurance.pdf',
			folderPath: 'Insurance/Home/health-insurance.pdf',
		})

		expect(resolved.policyType).toBe('home')
		expect(resolved.source).toBe('CONTENT_AI')
	})

	it('Insurance: folder used only when AI type missing', () => {
		const resolved = resolveInsurancePolicyClassification({
			aiPolicyType: null,
			aiConfidence: 0,
			categoryHint: 'health',
			fileName: 'policy.pdf',
			folderPath: 'Insurance/Health/policy.pdf',
		})

		expect(resolved.policyType).toBe('health')
		expect(resolved.source).toBe('FOLDER')
	})

	it('Vehicles: motor policy content wins over generic insurance filename in health folder', () => {
		const resolved = resolveVehicleDocumentClassification({
			aiDocumentType: 'insurance',
			aiConfidence: 0.9,
			fileName: 'insurance.pdf',
			folderPath: 'Vehicles/XEV 9e/Insurance/insurance.pdf',
		})

		expect(resolved.documentType).toBe('insurance')
		expect(resolved.documentSubtype).toBe('motor_policy')
		expect(resolved.source).toBe('CONTENT_AI')
	})

	it('Finance: AI loan statement wins over bank folder hint', () => {
		const resolved = resolveFinanceDocumentClassification({
			aiDocumentType: 'loan-statement',
			aiConfidence: 0.86,
			fileName: 'statement.pdf',
			folderPath: 'Finance/Bank/statement.pdf',
			extractedText: 'Home loan account statement',
		})

		expect(resolved.documentType).toBe('loan-statement')
		expect(resolved.source).toBe('CONTENT_AI')
	})
})
