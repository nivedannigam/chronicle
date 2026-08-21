import { test, expect } from '@playwright/test'
import { prepareQaFullDataset, prepareQaScenario } from './helpers'

test('reset clears only QA namespace keys', async ({ page }) => {
	await page.goto('/home')
	await expect(page.getByTestId('qa-mode-indicator')).toBeVisible()

	await page.evaluate(() => {
		window.localStorage.setItem('chronicle:production:keep', '1')
		window.__CHRONICLE_QA__?.reset('FULL')
	})

	const keys = await page.evaluate(() => Object.keys(window.localStorage))
	expect(keys.some((key) => key.startsWith('chronicle:qa:v1:'))).toBeTruthy()
	expect(keys).toContain('chronicle:production:keep')

	await page.evaluate(() => window.__CHRONICLE_QA__?.clear())

	const afterClear = await page.evaluate(() => Object.keys(window.localStorage))
	expect(
		afterClear.some((key) => key.startsWith('chronicle:qa:v1:')),
	).toBeFalsy()
	expect(afterClear).toContain('chronicle:production:keep')
})

test('reset → EMPTY baseline then FULL seed', async ({ page }) => {
	await page.goto('/home')
	await page.evaluate(() => window.__CHRONICLE_QA__?.clear())
	await page.evaluate(() => window.__CHRONICLE_QA__?.seed('EMPTY'))
	await page.reload()

	let docCount = await page.evaluate(() => {
		const raw = window.localStorage.getItem('chronicle:qa:v1:dataset')
		return JSON.parse(raw ?? '{}').documents?.length ?? -1
	})
	expect(docCount).toBe(0)

	await page.evaluate(() => window.__CHRONICLE_QA__?.seed('FULL'))
	await page.reload()

	docCount = await page.evaluate(() => {
		const raw = window.localStorage.getItem('chronicle:qa:v1:dataset')
		return JSON.parse(raw ?? '{}').documents?.length ?? -1
	})
	expect(docCount).toBeGreaterThan(5)
})

test('ERROR scenario does not leak into subsequent FULL reset', async ({
	page,
}) => {
	await prepareQaScenario(page, 'ERROR')
	await prepareQaFullDataset(page)

	const flags = await page.evaluate(() => {
		const raw = window.localStorage.getItem('chronicle:qa:v1:dataset')
		return JSON.parse(raw ?? '{}').flags ?? {}
	})

	expect(flags.aiFailure).toBeFalsy()
	expect(flags.driveConnected).toBeTruthy()
})
