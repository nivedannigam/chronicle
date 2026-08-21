import { expect, type Page } from '@playwright/test'

export async function waitForAskReady(page: Page) {
	await page.goto('/ask', { waitUntil: 'networkidle' })
	await expect(getAskInput(page)).toBeVisible({ timeout: 15_000 })
}

export function getAskInput(page: Page) {
	return page.getByRole('textbox', { name: /ask a question/i })
}

export function getAskSendButton(page: Page) {
	return page.getByRole('button', { name: /^Send$/i })
}

export async function submitAskQuestion(page: Page, question: string) {
	await waitForAskReady(page)
	const input = getAskInput(page)
	await input.fill(question)
	await getAskSendButton(page).click()
}

export async function waitForAskResponse(page: Page, timeout = 60_000) {
	const conversation = page.getByRole('log', { name: 'Conversation' })
	await expect(conversation).toBeVisible({ timeout: 15_000 })

	await expect
		.poll(
			async () => {
				const text = (await conversation.innerText()).toLowerCase()

				if (/thinking|reviewing your health records/i.test(text)) {
					return false
				}

				const lines = text
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line.length > 12)

				return lines.length >= 2
			},
			{ timeout },
		)
		.toBe(true)
}
