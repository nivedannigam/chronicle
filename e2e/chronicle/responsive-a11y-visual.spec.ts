import { test, expect } from '@playwright/test'
import { prepareQaFullDataset, assertPageRendered } from './helpers'
import { waitForAskReady } from './ask-helpers'

const SCREENSHOT_PATHS = [
	'/home',
	'/modules',
	'/health',
	'/insurance',
	'/vehicles',
	'/identity',
	'/finance',
	'/property',
	'/documents/library',
	'/ask',
	'/timeline',
	'/profile',
]

test.describe('Responsive smoke', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	for (const path of SCREENSHOT_PATHS) {
		test(`no horizontal overflow on ${path}`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'networkidle' })
			await assertPageRendered(page)
		})
	}
})

test.describe('Accessibility smoke', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	test('primary navigation has accessible names', async ({ page }) => {
		await page.goto('/home')
		await expect(
			page.getByRole('navigation', { name: 'Primary navigation' }),
		).toBeVisible()
	})

	test('ask composer has accessible label', async ({ page }) => {
		await page.goto('/ask')
		await waitForAskReady(page)
	})

	test('search input is reachable', async ({ page }) => {
		await page.goto('/search')
		const search = page
			.getByRole('searchbox')
			.or(page.getByPlaceholder(/search/i))
			.first()
		await expect(search).toBeVisible()
	})
})

test.describe('Visual regression smoke', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	for (const path of SCREENSHOT_PATHS) {
		test(`screenshot ${path}`, async ({ page }, testInfo) => {
			test.skip(
				testInfo.project.name !== 'chronicle-desktop',
				'Screenshots on desktop only',
			)

			await page.goto(path, { waitUntil: 'networkidle' })
			await expect(page.getByTestId('qa-mode-indicator')).toBeVisible()
			await assertPageRendered(page)

			await testInfo.attach(`visual-${path.replace(/\//g, '_')}`, {
				body: await page.screenshot({ fullPage: true }),
				contentType: 'image/png',
			})
		})
	}
})

test.describe('Performance smoke', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	test('home and modules load within budget', async ({ page }) => {
		const budgets: Array<{ path: string; maxMs: number }> = [
			{ path: '/home', maxMs: 10_000 },
			{ path: '/modules', maxMs: 10_000 },
			{ path: '/documents/library', maxMs: 12_000 },
			{ path: '/search', maxMs: 10_000 },
		]

		for (const item of budgets) {
			const started = Date.now()
			await page.goto(item.path, { waitUntil: 'networkidle' })
			const elapsed = Date.now() - started
			expect(elapsed, `${item.path} load time`).toBeLessThan(item.maxMs)
		}
	})
})
