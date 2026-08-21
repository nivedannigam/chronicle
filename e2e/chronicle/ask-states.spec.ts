import { test, expect } from '@playwright/test'
import { FORBIDDEN_UI_TERMS } from './route-catalog'
import {
	assertEmptyModuleState,
	prepareQaFullDataset,
	prepareQaScenario,
} from './helpers'
import {
	getAskInput,
	submitAskQuestion,
	waitForAskReady,
	waitForAskResponse,
} from './ask-helpers'

test.describe('Ask', () => {
	test.setTimeout(120_000)

	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	test('ask page loads with reachable composer', async ({ page }) => {
		await page.goto('/ask', { waitUntil: 'networkidle' })
		await waitForAskReady(page)
		await getAskInput(page).fill('Hello Chronicle')
		await expect(getAskInput(page)).toHaveValue('Hello Chronicle')
	})

	const questions = [
		{
			q: 'What is my LDL?',
			expect: /ldl|cholesterol|118|don’t have|do not have|couldn’t find/i,
		},
		{
			q: 'When does my car insurance expire?',
			expect: /insurance|expire|2026|xev|sept|vehicle/i,
		},
		{
			q: 'What is my home loan balance?',
			expect: /loan|balance|824|home|finance/i,
		},
		{
			q: 'When does my passport expire?',
			expect: /passport|expir|2031|don’t have|do not have|couldn’t find/i,
		},
		{
			q: 'What insurance do I have?',
			expect: /insurance|policy|health|term|home|vehicle/i,
		},
	]

	for (const item of questions) {
		test(`ask: ${item.q}`, async ({ page }) => {
			await submitAskQuestion(page, item.q)
			await waitForAskResponse(page)
			const answer = (await page.locator('#root').innerText()).toLowerCase()
			expect(answer).toMatch(item.expect)
			for (const term of FORBIDDEN_UI_TERMS) {
				expect(answer).not.toContain(term)
			}
		})
	}

	test('negative ask returns honest missing-data response', async ({
		page,
	}) => {
		await submitAskQuestion(
			page,
			"When does my second property's insurance expire?",
		)
		await waitForAskResponse(page)
		const answer = (await page.locator('#root').innerText()).toLowerCase()
		expect(answer).toMatch(
			/don’t have|do not have|couldn’t find|can't find|no record|not find|missing|nagpur/i,
		)
	})

	test('ambiguous balance question scopes safely', async ({ page }) => {
		await submitAskQuestion(page, 'What is my balance?')
		await waitForAskResponse(page)
		const answer = (await page.locator('#root').innerText()).toLowerCase()
		expect(answer).toMatch(/balance|account|loan|clarify|which|savings|home/i)
	})
})

test.describe('Family privacy', () => {
	test.setTimeout(120_000)

	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	test('daughter context does not reveal parent passport number in ask', async ({
		page,
	}) => {
		await page.goto('/ask', { waitUntil: 'networkidle' })
		await submitAskQuestion(page, 'What is my passport number?')
		await waitForAskResponse(page)
		const answer = await page.locator('#root').innerText()
		expect(answer).not.toContain('QA1234567')
	})
})

test.describe('Empty user scenario', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaScenario(page, 'EMPTY')
	})

	test('EMPTY dataset has zero documents', async ({ page }) => {
		const counts = await page.evaluate(() => {
			const raw = window.localStorage.getItem('chronicle:qa:v1:dataset')
			const dataset = raw ? JSON.parse(raw) : null
			return {
				documents: dataset?.documents?.length ?? -1,
				healthReports: dataset?.healthReports?.length ?? -1,
			}
		})

		expect(counts.documents).toBe(0)
		expect(counts.healthReports).toBe(0)
	})

	for (const path of [
		'/health',
		'/insurance',
		'/vehicles',
		'/identity',
		'/finance',
		'/property',
	]) {
		test(`empty state ${path}`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'networkidle' })
			await assertEmptyModuleState(page)
			const text = (await page.locator('#root').innerText()).toLowerCase()
			for (const term of FORBIDDEN_UI_TERMS) {
				expect(text).not.toContain(term)
			}
		})
	}
})

test.describe('Error scenario', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaScenario(page, 'ERROR')
	})

	test('consumer-safe errors on modules home', async ({ page }) => {
		for (const path of ['/health', '/insurance', '/ask']) {
			await page.goto(path, { waitUntil: 'networkidle' })
			const text = (await page.locator('#root').innerText()).toLowerCase()
			for (const term of FORBIDDEN_UI_TERMS) {
				expect(text).not.toContain(term)
			}
		}
	})
})

test.describe('Loading scenario', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaScenario(page, 'LOADING')
	})

	test('shows loading/skeleton instead of blank page', async ({ page }) => {
		await page.goto('/health', { waitUntil: 'domcontentloaded' })
		await expect(page.locator('#root')).not.toBeEmpty()
		await page.waitForTimeout(3000)
		await expect(page.locator('#root')).not.toBeEmpty()
	})
})

test.describe('Scenario isolation', () => {
	test('FULL after EMPTY restores seeded records', async ({ page }) => {
		await prepareQaScenario(page, 'EMPTY')
		let counts = await page.evaluate(() => {
			const raw = window.localStorage.getItem('chronicle:qa:v1:dataset')
			return JSON.parse(raw ?? '{}').documents?.length ?? 0
		})
		expect(counts).toBe(0)

		await prepareQaFullDataset(page)
		counts = await page.evaluate(() => {
			const raw = window.localStorage.getItem('chronicle:qa:v1:dataset')
			return JSON.parse(raw ?? '{}').documents?.length ?? 0
		})
		expect(counts).toBeGreaterThan(5)
	})
})
