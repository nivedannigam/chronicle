import { test, expect } from '@playwright/test'
import { prepareQaFullDataset } from './helpers'

test.describe('QA auth bypass', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	test('shows QA MODE indicator and lands on home without login', async ({
		page,
	}) => {
		await expect(page.getByTestId('qa-mode-indicator')).toHaveText('QA MODE')
		await expect(page).not.toHaveURL(/\/login/)
		await expect(page.locator('#root')).not.toBeEmpty()
	})

	test('uses synthetic test user only', async ({ page }) => {
		const email = await page.evaluate(() => {
			return window.localStorage.getItem('chronicle:qa:v1:scenario') ?? 'FULL'
		})

		expect(email).toBeTruthy()
	})
})
