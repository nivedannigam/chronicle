import { test, expect } from '@playwright/test'
import { QA_PRIVACY_MARKERS } from '../../src/qa/seed/build-qa-privacy-trust'
import { prepareQaFullDataset } from './helpers'
import {
	submitAskQuestion,
	waitForAskReady,
	waitForAskResponse,
} from './ask-helpers'

test.describe('Gate 0 trust privacy', () => {
	test.setTimeout(120_000)

	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	test('Ask blocks cross-member health question in default member view', async ({
		page,
	}) => {
		await page.goto('/ask', { waitUntil: 'networkidle' })
		await waitForAskReady(page)

		await submitAskQuestion(page, "What is Priya's LDL?")
		await waitForAskResponse(page)

		const answer = await page.locator('#root').innerText()
		expect(answer).not.toContain(QA_PRIVACY_MARKERS.priyaLdl)
		expect(answer.toLowerCase()).toMatch(/can't share|cannot share|private/i)
	})

	test('Ask does not reveal Ravi passport for cross-member question', async ({
		page,
	}) => {
		await page.goto('/ask', { waitUntil: 'networkidle' })
		await waitForAskReady(page)

		await submitAskQuestion(page, "What is Ravi's passport number?")
		await waitForAskResponse(page)

		const answer = await page.locator('#root').innerText()
		expect(answer).not.toContain(QA_PRIVACY_MARKERS.raviPassport)
	})

	test('Library browse does not list Priya private insurance title', async ({
		page,
	}) => {
		await page.goto('/documents/library', { waitUntil: 'networkidle' })
		await expect(page.locator('#root')).not.toBeEmpty()

		const text = await page.locator('#root').innerText()
		expect(text).not.toContain('Priya QA Private Health Policy')
	})

	test('Search does not surface Priya private policy number', async ({
		page,
	}) => {
		await page.goto('/search', { waitUntil: 'networkidle' })
		await page
			.getByPlaceholder('Search everything…')
			.fill(QA_PRIVACY_MARKERS.priyaInsurancePolicy)
		await page.waitForTimeout(1500)

		const text = await page.locator('#root').innerText()
		expect(text).not.toContain(QA_PRIVACY_MARKERS.priyaInsurancePolicy)
	})
})
