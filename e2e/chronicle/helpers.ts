import { expect, type Page, type TestInfo } from '@playwright/test'
import {
	isAllowlistedQaNetworkFailure,
	isIgnoredQaConsoleError,
} from '../../src/qa/qa-network-policy'
import type { RouteContract } from './route-catalog'

export interface RouteAuditResult {
	route: string
	expectedScreen: string
	loaded: boolean
	consoleErrors: string[]
	networkErrors: string[]
	result: 'pass' | 'fail' | 'skip'
	priority: 'P0' | 'P1' | 'P2'
	notes?: string
}

async function waitForQaBootstrap(page: Page) {
	await page.waitForFunction(
		() =>
			typeof window.__CHRONICLE_QA__?.reset === 'function' &&
			typeof window.__CHRONICLE_QA__?.setScenario === 'function',
		undefined,
		{ timeout: 30_000 },
	)
	await expect(page.getByTestId('qa-mode-indicator')).toBeVisible({
		timeout: 30_000,
	})
}

export async function prepareQaFullDataset(page: Page) {
	await page.goto('/home', { waitUntil: 'domcontentloaded' })
	await waitForQaBootstrap(page)
	await page.evaluate(() => {
		window.__CHRONICLE_QA__?.reset('FULL')
	})
	await page.reload({ waitUntil: 'domcontentloaded' })
	await waitForQaBootstrap(page)
	await page.waitForLoadState('networkidle')
}

export async function prepareQaScenario(
	page: Page,
	scenario: 'FULL' | 'EMPTY' | 'ERROR' | 'LOADING',
) {
	await page.goto('/home', { waitUntil: 'domcontentloaded' })
	await waitForQaBootstrap(page)
	await page.evaluate((nextScenario) => {
		window.__CHRONICLE_QA__?.setScenario(nextScenario)
	}, scenario)
	await page.reload({ waitUntil: 'domcontentloaded' })
	await waitForQaBootstrap(page)
	await page.waitForLoadState('networkidle')
}

export function attachConsoleNetworkAudit(page: Page) {
	const consoleErrors: string[] = []
	const networkErrors: string[] = []

	page.on('console', (message) => {
		if (message.type() !== 'error') {
			return
		}

		const text = message.text()

		if (isIgnoredQaConsoleError(text)) {
			return
		}

		if (/Failed to load resource/i.test(text)) {
			return
		}

		consoleErrors.push(text)
	})

	page.on('pageerror', (error) => {
		if (!isIgnoredQaConsoleError(error.message)) {
			consoleErrors.push(error.message)
		}
	})

	page.on('response', (response) => {
		const url = response.url()
		const status = response.status()

		if (status >= 400 && !isAllowlistedQaNetworkFailure(url, status)) {
			networkErrors.push(`${status} ${url}`)
		}
	})

	return { consoleErrors, networkErrors }
}

export async function assertPageRendered(page: Page) {
	await expect(page.locator('#root')).toBeVisible()
	const rootText = (await page.locator('#root').innerText()).trim()
	expect(rootText.length).toBeGreaterThan(0)

	const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
	const viewportWidth = page.viewportSize()?.width ?? 1440
	expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2)
}

export async function verifyRouteContract(page: Page, contract: RouteContract) {
	await assertPageRendered(page)

	if (contract.redirectsTo) {
		await expect(page).toHaveURL(contract.redirectsTo)
	} else {
		await expect(page).toHaveURL(
			new RegExp(`${contract.path.replace(/\//g, '\\/')}(\\?.*)?$`),
		)
	}

	if (contract.screenTitle) {
		await expect(
			page.getByRole('heading', { name: contract.screenTitle }).first(),
		).toBeVisible({ timeout: 15_000 })
	}

	if (contract.testId) {
		await expect(page.getByTestId(contract.testId)).toBeVisible({
			timeout: 15_000,
		})
	}

	if (contract.marker) {
		await expect(page.locator('#root')).toContainText(contract.marker, {
			timeout: 15_000,
		})
	}
}

export async function auditRoute(
	page: Page,
	contract: RouteContract,
	testInfo: TestInfo,
): Promise<RouteAuditResult> {
	const audit = attachConsoleNetworkAudit(page)

	await page.goto(contract.path, { waitUntil: 'domcontentloaded' })
	await page.waitForLoadState('networkidle')

	let loaded = true
	let notes: string | undefined

	try {
		await verifyRouteContract(page, contract)
	} catch (error) {
		loaded = false
		notes = error instanceof Error ? error.message : String(error)
		await testInfo.attach(
			`route-failure-${contract.path.replace(/\//g, '_')}`,
			{
				body: await page.screenshot({ fullPage: true }),
				contentType: 'image/png',
			},
		)
	}

	const hasCriticalNetwork = audit.networkErrors.length > 0
	const hasCriticalConsole = audit.consoleErrors.length > 0
	const passed = loaded && !hasCriticalNetwork && !hasCriticalConsole

	return {
		route: contract.path,
		expectedScreen: contract.expectedScreen,
		loaded,
		consoleErrors: [...audit.consoleErrors],
		networkErrors: [...audit.networkErrors],
		result: passed ? 'pass' : 'fail',
		priority: contract.priority,
		notes: [notes, ...audit.consoleErrors, ...audit.networkErrors]
			.filter(Boolean)
			.join(' | '),
	}
}

export async function assertEmptyModuleState(page: Page) {
	await assertPageRendered(page)

	await expect
		.poll(async () => (await page.locator('#root').innerText()).length, {
			timeout: 15_000,
		})
		.toBeGreaterThan(40)

	const text = (await page.locator('#root').innerText()).toLowerCase()
	expect(text).toMatch(
		/add|connect|import|set up|upload|get started|no |empty|folder|documents|records|yet|awaiting|laboratory|choose folder|drive/i,
	)
}

export function summarizeAudits(audits: RouteAuditResult[]) {
	const passed = audits.filter((audit) => audit.result === 'pass').length
	const failed = audits.filter((audit) => audit.result === 'fail').length
	const skipped = audits.filter((audit) => audit.result === 'skip').length

	return {
		passed,
		failed,
		skipped,
		p0Failures: audits.filter((a) => a.result === 'fail' && a.priority === 'P0')
			.length,
		p1Failures: audits.filter((a) => a.result === 'fail' && a.priority === 'P1')
			.length,
		p2Failures: audits.filter((a) => a.result === 'fail' && a.priority === 'P2')
			.length,
		total: audits.length,
	}
}
