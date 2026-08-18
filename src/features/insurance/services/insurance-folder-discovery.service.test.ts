import {
	discoverInsuranceCategoriesFromFolderNames,
	inferCategoryFromFolderPath,
	resolveInsuranceCategoryHint,
} from '@/features/insurance/services/insurance-folder-discovery.service'
import { describe, expect, it } from 'vitest'

describe('insurance folder discovery', () => {
	it('discovers health, life, home, and vehicle categories from subfolder names', () => {
		const categories = discoverInsuranceCategoriesFromFolderNames([
			'Insurance',
			'Health',
			'Life',
			'Home',
			'Vehicle',
		])

		expect(categories.map((category) => category.id).sort()).toEqual([
			'health',
			'home',
			'life_term',
			'motor',
		])
	})

	it('classifies Insurance/Health/Policy.pdf from folder path', () => {
		expect(inferCategoryFromFolderPath('Insurance/Health/Policy.pdf')).toBe(
			'health',
		)
		expect(inferCategoryFromFolderPath('Insurance/Life/term-policy.pdf')).toBe(
			'life_term',
		)
		expect(inferCategoryFromFolderPath('Insurance/Home/house.pdf')).toBe('home')
		expect(inferCategoryFromFolderPath('Insurance/Vehicle/car.pdf')).toBe(
			'motor',
		)
	})

	it('prefers folder path over generic filename', () => {
		expect(
			resolveInsuranceCategoryHint({
				folderPath: 'Insurance/Health/Policy.pdf',
				fileName: 'Policy.pdf',
			}),
		).toBe('health')
	})

	it('supports mediclaim and term life folder variants', () => {
		expect(inferCategoryFromFolderPath('Insurance/Mediclaim/plan.pdf')).toBe(
			'health',
		)
		expect(inferCategoryFromFolderPath('Insurance/Term Life/policy.pdf')).toBe(
			'life_term',
		)
	})
})
