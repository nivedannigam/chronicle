import { test, expect } from '@playwright/test'
import { FORBIDDEN_RAW_IDENTIFIERS, FORBIDDEN_UI_TERMS } from './route-catalog'
import { assertPageRendered, prepareQaFullDataset } from './helpers'

test.describe('Library', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	test('library lists seeded documents', async ({ page }) => {
		await page.goto('/documents/library', { waitUntil: 'networkidle' })
		await assertPageRendered(page)
		await expect(
			page.getByText(/Pune Home Registration|XEV 9e|QA Health/i).first(),
		).toBeVisible({
			timeout: 15_000,
		})
	})

	test('library has no nested interactive buttons in cards', async ({
		page,
	}) => {
		await page.goto('/documents/library', { waitUntil: 'networkidle' })
		const nested = await page.evaluate(() => {
			return Boolean(document.querySelector('button button'))
		})
		expect(nested).toBe(false)
	})

	test('library search filters results', async ({ page }) => {
		await page.goto('/documents/library', { waitUntil: 'networkidle' })
		const search = page.getByPlaceholder(/search/i).first()
		await search.fill('Pune')
		await page.waitForTimeout(500)
		await expect(page.getByText(/pune/i).first()).toBeVisible({
			timeout: 10_000,
		})
	})
})

test.describe('Search', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	for (const query of [
		'health',
		'insurance',
		'vehicle',
		'identity',
		'finance',
		'property',
		'Pune',
		'XEV',
	]) {
		test(`search query "${query}" returns results`, async ({ page }) => {
			await page.goto('/search', { waitUntil: 'networkidle' })
			const input = page
				.getByRole('searchbox')
				.or(page.getByPlaceholder(/search/i))
				.first()
			await input.fill(query)
			await page.keyboard.press('Enter')
			await page.waitForTimeout(800)
			await assertPageRendered(page)
			const body = await page.locator('#root').innerText()
			expect(body.length).toBeGreaterThan(20)
		})
	}
})

test.describe('Timeline', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	test('timeline shows consumer-facing events', async ({ page }) => {
		await page.goto('/timeline', { waitUntil: 'networkidle' })
		await assertPageRendered(page)
		const text = (await page.locator('#root').innerText()).toLowerCase()

		expect(text).not.toContain('pdf uploaded')
		expect(text).not.toContain('ocr')
		expect(text).not.toContain('drive sync')
	})
})

test.describe('Privacy UI', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	for (const path of [
		'/home',
		'/modules',
		'/documents/library',
		'/search',
		'/timeline',
		'/ask',
	]) {
		test(`masks raw identifiers on ${path}`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'networkidle' })
			const text = await page.locator('#root').innerText()

			for (const identifier of FORBIDDEN_RAW_IDENTIFIERS) {
				expect(text).not.toContain(identifier)
			}
		})
	}
})

test.describe('Forbidden engineering language', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	test('home and modules avoid raw engineering errors', async ({ page }) => {
		for (const path of ['/home', '/modules', '/health', '/insurance']) {
			await page.goto(path, { waitUntil: 'networkidle' })
			const text = (await page.locator('#root').innerText()).toLowerCase()

			for (const term of FORBIDDEN_UI_TERMS) {
				expect(text).not.toContain(term)
			}
		}
	})
})
