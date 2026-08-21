import { test, expect } from '@playwright/test'
import { BOTTOM_NAV_LABELS, NAVIGATION_FLOWS } from './route-catalog'
import { assertPageRendered, prepareQaFullDataset } from './helpers'

test.describe('Navigation flows', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	for (const flow of NAVIGATION_FLOWS) {
		test(flow.label, async ({ page }) => {
			await page.goto(flow.from, { waitUntil: 'networkidle' })
			await assertPageRendered(page)
			await page.goto(flow.to, { waitUntil: 'networkidle' })
			await assertPageRendered(page)
			await expect(page).toHaveURL((url) => {
				const current = new URL(url)
				const expected = new URL(flow.to, 'http://127.0.0.1')
				return (
					current.pathname === expected.pathname &&
					current.search === expected.search
				)
			})
		})
	}

	test('bottom navigation reaches core tabs', async ({ page }) => {
		await page.goto('/home')

		const nav = page.getByRole('navigation', { name: 'Primary navigation' })
		await expect(nav).toBeVisible()

		for (const label of BOTTOM_NAV_LABELS) {
			await nav.getByRole('button', { name: label }).click()
			await assertPageRendered(page)
		}
	})
})
