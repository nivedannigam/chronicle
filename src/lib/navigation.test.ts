import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/constants/routes'
import { pathFromTab, tabFromPath } from '@/lib/navigation'

describe('tabFromPath', () => {
	it('maps global shell routes to bottom navigation tabs', () => {
		expect(tabFromPath(ROUTES.home)).toBe('home')
		expect(tabFromPath(ROUTES.modules)).toBe('modules')
		expect(tabFromPath(ROUTES.ask)).toBe('ask')
		expect(tabFromPath(ROUTES.documents)).toBe('library')
		expect(tabFromPath(ROUTES.profile)).toBe('profile')
	})

	it('maps life module routes to the modules tab', () => {
		expect(tabFromPath(ROUTES.health)).toBe('modules')
		expect(tabFromPath(ROUTES.insurance)).toBe('modules')
		expect(tabFromPath(ROUTES.vehicles)).toBe('modules')
		expect(tabFromPath(`${ROUTES.health}/reports`)).toBe('modules')
	})

	it('redirects legacy more route to modules tab', () => {
		expect(tabFromPath(ROUTES.more)).toBe('modules')
	})
})

describe('pathFromTab', () => {
	it('returns primary routes for each tab', () => {
		expect(pathFromTab('home')).toBe(ROUTES.home)
		expect(pathFromTab('modules')).toBe(ROUTES.modules)
		expect(pathFromTab('ask')).toBe(ROUTES.ask)
		expect(pathFromTab('library')).toBe(ROUTES.documents)
		expect(pathFromTab('profile')).toBe(ROUTES.profile)
	})
})
