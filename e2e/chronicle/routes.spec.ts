import { test, expect } from '@playwright/test'
import { CHRONICLE_ROUTE_CONTRACTS } from './route-catalog'
import {
	auditRoute,
	prepareQaFullDataset,
	verifyRouteContract,
} from './helpers'

test.describe('Route matrix', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	for (const contract of CHRONICLE_ROUTE_CONTRACTS) {
		test(`route ${contract.path} → ${contract.expectedScreen}`, async ({
			page,
		}, testInfo) => {
			test.skip(
				Boolean(contract.requiresFullDataset) &&
					testInfo.project.name !== 'chronicle-desktop',
				'Detail routes run on desktop project only',
			)

			const audit = await auditRoute(page, contract, testInfo)

			expect(audit.loaded, audit.notes ?? 'Route failed to load').toBeTruthy()
			expect(audit.consoleErrors, audit.consoleErrors.join('\n')).toHaveLength(
				0,
			)
			expect(audit.networkErrors, audit.networkErrors.join('\n')).toHaveLength(
				0,
			)
		})
	}
})

test.describe('Route contracts', () => {
	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	test('/ask contract', async ({ page }) => {
		await page.goto('/ask')
		await verifyRouteContract(page, {
			path: '/ask',
			expectedScreen: 'Ask',
			priority: 'P0',
			screenTitle: 'Ask Chronicle',
		})
	})
})
