import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.CHRONICLE_QA_PORT ?? 5199)
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
	testDir: './e2e/chronicle',
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	timeout: 120_000,
	reporter: [
		['list'],
		['json', { outputFile: 'test-results/chronicle-qa/results.json' }],
		['html', { outputFolder: 'playwright-report/chronicle-qa', open: 'never' }],
	],
	use: {
		baseURL: BASE_URL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'off',
	},
	projects: [
		{
			name: 'chronicle-desktop',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1440, height: 900 },
			},
		},
		{
			name: 'chronicle-tablet',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 768, height: 1024 },
			},
		},
		{
			name: 'chronicle-mobile',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 390, height: 844 },
			},
		},
	],
	webServer: {
		command: `pnpm exec vite --host 127.0.0.1 --port ${PORT}`,
		url: BASE_URL,
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			...process.env,
			VITE_CHRONICLE_QA_MODE: 'true',
		},
	},
})
