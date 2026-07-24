import { describe, expect, it } from 'vitest'
import { scoreMedicalFile } from '@/features/medical-discovery/services/medical-scoring.service'

describe('scoreMedicalFile', () => {
	it('classifies Complete Blood Test.pdf as import candidate', () => {
		const result = scoreMedicalFile({
			fileName: 'Complete Blood Test.pdf',
			mimeType: 'application/pdf',
			folderPath: 'Health',
		})

		expect(result.category).not.toBe('ignored')
	})

	it('classifies dated lab PDF in assigned folder as likely_medical', () => {
		const result = scoreMedicalFile({
			fileName: '2022 Jan - Complete Blood Test.pdf',
			mimeType: 'application/pdf',
			folderPath: 'Nivedan',
			isAssignedHealthFolder: true,
		})

		expect(['likely_medical', 'needs_review']).toContain(result.category)
		expect(result.category).not.toBe('ignored')
	})

	it('classifies invoice-only PDF as ignored when no medical keywords', () => {
		const result = scoreMedicalFile({
			fileName: 'Hospital Invoice March.pdf',
			mimeType: 'application/pdf',
			folderPath: 'Billing',
		})

		expect(result.category).toBe('ignored')
	})

	it('boosts confidence for PDFs in assigned health folders', () => {
		const withoutFolder = scoreMedicalFile({
			fileName: 'Lab Results.pdf',
			mimeType: 'application/pdf',
			folderPath: 'Docs',
		})
		const withFolder = scoreMedicalFile({
			fileName: 'Lab Results.pdf',
			mimeType: 'application/pdf',
			folderPath: 'Docs',
			isAssignedHealthFolder: true,
		})

		expect(withFolder.confidence).toBeGreaterThan(withoutFolder.confidence)
	})
})
