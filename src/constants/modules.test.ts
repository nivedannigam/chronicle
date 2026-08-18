import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/constants/routes'
import {
	COMING_SOON_MODULE_IDS,
	getAvailableLifeModules,
	getHubComingSoonModules,
	getHubPrimaryModules,
	isModuleNavigable,
	LIFE_MODULE_REGISTRY,
} from '@/constants/modules'

describe('LIFE_MODULE_REGISTRY', () => {
	it('defines all ten life modules', () => {
		expect(LIFE_MODULE_REGISTRY).toHaveLength(10)
	})

	it('includes required fields for every module', () => {
		for (const module of LIFE_MODULE_REGISTRY) {
			expect(module.id).toBeTruthy()
			expect(module.name).toBeTruthy()
			expect(module.description).toBeTruthy()
			expect(module.icon).toBeTruthy()
			expect(module.status).toMatch(/^(available|building|coming_soon)$/)
			expect(module.category).toBe('life')
		}
	})
})

describe('Modules hub sections', () => {
	it('lists the four primary life modules first', () => {
		const primary = getHubPrimaryModules()
		expect(primary.map((module) => module.id)).toEqual([
			'health',
			'insurance',
			'vehicles',
			'identity',
		])
		expect(primary).toHaveLength(4)
	})

	it('lists coming soon modules separately', () => {
		const comingSoon = getHubComingSoonModules()
		expect(comingSoon.map((module) => module.id)).toEqual([
			...COMING_SOON_MODULE_IDS,
		])
		expect(comingSoon).toHaveLength(5)
	})
})

describe('isModuleNavigable', () => {
	it('allows navigation only for available modules with routes', () => {
		const navigable = getAvailableLifeModules()
		expect(navigable.map((module) => module.id)).toEqual([
			'health',
			'insurance',
			'vehicles',
			'identity',
			'personal',
		])

		for (const module of navigable) {
			expect(isModuleNavigable(module)).toBe(true)
			expect(module.route).toBeTruthy()
		}
	})

	it('blocks navigation for building and coming soon modules', () => {
		const identity = LIFE_MODULE_REGISTRY.find(
			(module) => module.id === 'identity',
		)
		expect(identity?.status).toBe('available')
		expect(isModuleNavigable(identity!)).toBe(true)
		expect(identity?.route).toBe(ROUTES.identity)

		for (const module of getHubComingSoonModules()) {
			expect(isModuleNavigable(module)).toBe(false)
			expect(module.route).toBeUndefined()
		}
	})

	it('maps available modules to existing routes', () => {
		expect(LIFE_MODULE_REGISTRY.find((m) => m.id === 'health')?.route).toBe(
			ROUTES.health,
		)
		expect(LIFE_MODULE_REGISTRY.find((m) => m.id === 'insurance')?.route).toBe(
			ROUTES.insurance,
		)
		expect(LIFE_MODULE_REGISTRY.find((m) => m.id === 'vehicles')?.route).toBe(
			ROUTES.vehicles,
		)
		expect(LIFE_MODULE_REGISTRY.find((m) => m.id === 'personal')?.route).toBe(
			ROUTES.personal,
		)
		expect(LIFE_MODULE_REGISTRY.find((m) => m.id === 'identity')?.route).toBe(
			ROUTES.identity,
		)
	})
})
