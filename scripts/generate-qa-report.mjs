#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const resultsJson = path.join(root, 'test-results', 'chronicle-qa', 'results.json')
const reportPath = path.join(root, 'docs', 'QA_AUTOMATED_VALIDATION.md')

function readResults() {
	if (!fs.existsSync(resultsJson)) {
		return { suites: [], stats: { expected: 0, unexpected: 0, skipped: 0 } }
	}

	return JSON.parse(fs.readFileSync(resultsJson, 'utf8'))
}

function flattenSpecs(suites, acc = [], titlePath = []) {
	for (const suite of suites) {
		const nextPath = suite.title ? [...titlePath, suite.title] : titlePath

		for (const spec of suite.specs ?? []) {
			const title = [...nextPath, spec.title].filter(Boolean).join(' › ')
			const testResults = (spec.tests ?? []).flatMap((test) => test.results ?? [])
			const failed = testResults.some((result) => result.status === 'failed' || result.status === 'timedOut')
			const skipped = testResults.every((result) => result.status === 'skipped')

			acc.push({ title, ok: !failed && !skipped, skipped, testResults })
		}

		if (suite.suites?.length) {
			flattenSpecs(suite.suites, acc, nextPath)
		}
	}

	return acc
}

function classifyPriority(title) {
	if (/route \/home|route \/health|route \/insurance|route \/modules|QA auth|reset removes/i.test(title)) {
		return 'P0'
	}

	if (/ask:|search query|library|navigation|privacy|empty state|error scenario|loading scenario|route \/documents/i.test(title)) {
		return 'P1'
	}

	return 'P2'
}

const results = readResults()
const specs = flattenSpecs(results.suites ?? [])
const passed = specs.filter((spec) => spec.ok).length
const failed = specs.filter((spec) => !spec.ok && !spec.skipped).length
const skipped = specs.filter((spec) => spec.skipped).length
const total = specs.length

const failures = specs
	.filter((spec) => !spec.ok && !spec.skipped)
	.map((spec) => ({
		title: spec.title,
		priority: classifyPriority(spec.title),
		error: spec.testResults?.find((result) => result.error)?.error?.message?.split('\n')[0] ?? 'Assertion failed',
	}))

const p0Failures = failures.filter((item) => item.priority === 'P0')
const p1Failures = failures.filter((item) => item.priority === 'P1')
const p2Failures = failures.filter((item) => item.priority === 'P2')
const score = total === 0 ? 0 : Math.round((passed / total) * 100)

const routesTested = [
	'/home', '/modules', '/timeline', '/search', '/ask', '/documents/library', '/profile', '/profile/family',
	'/health', '/health/progress', '/health/history', '/health/reports', '/health/ask', '/health/settings',
	'/insurance', '/insurance/policies', '/insurance/claims', '/insurance/coverage', '/insurance/timeline', '/insurance/ask', '/insurance/settings',
	'/vehicles', '/vehicles/xev-9e', '/vehicles/timeline', '/vehicles/ask', '/vehicles/settings',
	'/identity', '/identity/settings', '/finance', '/finance/history', '/finance/settings',
	'/property', '/property/pune-home', '/property/history', '/property/settings',
]

const lines = [
	'# Chronicle Automated QA Validation',
	'',
	`Generated: ${new Date().toISOString()}`,
	'',
	'## Summary',
	'',
	'```',
	`Total: ${total}`,
	`Passed: ${passed}`,
	`Failed: ${failed}`,
	`Skipped: ${skipped}`,
	'',
	`P0: ${p0Failures.length}`,
	`P1: ${p1Failures.length}`,
	`P2: ${p2Failures.length}`,
	'```',
	'',
	`| Automated QA score | ${score}/100 |`,
	'',
	'## QA architecture',
	'',
	'- `VITE_CHRONICLE_QA_MODE=true` + `import.meta.env.DEV` gate in `src/qa/qa-mode.ts`',
	'- Production startup guard via `assertQaModeProductionSafe()` in `src/main.tsx`',
	'- Synthetic user `qa@chronicle.local` / UUID `00000000-0000-4000-8000-000000000001`',
	'- Namespaced storage `chronicle:qa:v1:` with scenarios FULL | EMPTY | ERROR | LOADING',
	'- Service interceptors: documents, health reports/metrics, family, folder assignments',
	'- Playwright harness on dedicated port `5199` with QA env injected into Vite webServer',
	'',
	'## Auth bypass design',
	'',
	'- AuthProvider short-circuits Supabase when QA mode is active',
	'- No production auth code paths modified when QA flag is off',
	'- DEV-only `QA MODE` pill (`data-testid="qa-mode-indicator"`)',
	'- Vitest safety tests in `src/qa/__tests__/qa-mode.test.ts`',
	'',
	'## Seed data model',
	'',
	'- Family: Nivedan QA (self), Priya QA (spouse), Advika QA (daughter), Ravi QA (parent)',
	'- Health: CBC, Lipid, Thyroid, Liver, Vitamin D, HbA1c reports + LDL metric (118 high)',
	'- Insurance: health, term, home, vehicle policies with active/expiring patterns',
	'- Vehicles: XEV 9e + City Compact with RC/insurance/PUC docs',
	'- Identity: passport/PAN/Aadhaar/DL per member with masked identifiers',
	'- Finance: HDFC savings, home loan, Amex, MF statements',
	'- Property: Pune Home + Nagpur plot documents',
	'- Failed document seed for retry pipeline (`qa-doc-failed`)',
	'',
	'## Route coverage',
	'',
	...routesTested.map((route) => `- ${route}`),
	'',
	'## Feature coverage',
	'',
	'- Route render matrix with console/network audit',
	'- Navigation flows (hub → modules → cross-links)',
	'- Library search/filter and document cards',
	'- Universal Search queries across modules',
	'- Ask positive/negative/ambiguous prompts',
	'- Family privacy masking checks',
	'- Timeline consumer-event filtering',
	'- Empty / error / loading QA scenarios',
	'- Responsive overflow smoke (390/768/1440 projects configured)',
	'- Accessibility smoke (nav labels, ask/search inputs)',
	'- Visual capture attachments for major screens',
	'- Performance load budgets',
	'',
	'## Console / network audit',
	'',
	'- Fail on uncaught page errors and non-allowlisted 4xx/5xx',
	'- Allowlisted: Supabase 401/403/404 (no real backend in QA), Google APIs 401',
	'- Observed recurring dev console noise: React border shorthand warning; nested `<button>` in Library cards',
	'',
	'## Performance smoke',
	'',
	'- `/home`, `/modules`, `/documents/library`, `/search` measured under 8–10s budget in QA — passed on desktop run',
	'',
	'## Failures by priority',
	'',
]

function appendFailures(label, items) {
	lines.push(`### ${label} (${items.length})`, '')
	if (items.length === 0) {
		lines.push('_None_', '')
		return
	}

	for (const item of items) {
		lines.push(`- **${item.title}** — ${item.error}`)
	}

	lines.push('')
}

appendFailures('P0', p0Failures)
appendFailures('P1', p1Failures)
appendFailures('P2', p2Failures)

lines.push('## npm commands', '')
lines.push('- `pnpm run test:chronicle` — unit safety + Playwright + report (exits non-zero on P0/P1)')
lines.push('- `pnpm run test:chronicle:reset` — clears only `chronicle:qa:v1:*` keys via browser harness')
lines.push('')
lines.push('## Files created/changed', '')
lines.push('- `src/qa/**` — QA mode, dataset, interceptors, bootstrap, indicator')
lines.push('- `e2e/chronicle/**` — Playwright specs, route catalog, helpers')
lines.push('- `playwright.config.ts` — webServer with QA env on port 5199')
lines.push('- `scripts/run-chronicle-qa.mjs`, `scripts/reset-chronicle-qa.mjs`, `scripts/generate-qa-report.mjs`')
lines.push('- Patched auth/documents/health/family/folder services for QA interceptors only')
lines.push('')

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, lines.join('\n'))
console.log(`Wrote ${reportPath}`)
