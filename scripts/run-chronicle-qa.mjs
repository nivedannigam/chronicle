#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const resultsJson = path.join(root, 'test-results', 'chronicle-qa', 'results.json')
const reportPath = path.join(root, 'docs', 'QA_AUTOMATED_VALIDATION.md')

function run(command, args, env = process.env) {
	const result = spawnSync(command, args, {
		cwd: root,
		env,
		stdio: 'inherit',
		shell: process.platform === 'win32',
	})

	if (result.status !== 0) {
		process.exitCode = result.status ?? 1
	}

	return result.status ?? 1
}

console.log('Running Chronicle QA unit safety tests…')
run('pnpm', ['test', 'src/qa/__tests__/qa-mode.test.ts'])

console.log('Running Playwright Chronicle harness…')
const playwrightStatus = run('pnpm', ['exec', 'playwright', 'test'], {
	...process.env,
	VITE_CHRONICLE_QA_MODE: 'true',
})

console.log('Generating QA report…')
run('node', ['scripts/generate-qa-report.mjs'])

if (playwrightStatus !== 0) {
	process.exit(playwrightStatus)
}

if (!fs.existsSync(reportPath)) {
	console.error('QA report was not generated.')
	process.exit(1)
}

const report = fs.readFileSync(reportPath, 'utf8')
const p0Match = report.match(/P0:\s*(\d+)/)
const p1Match = report.match(/P1:\s*(\d+)/)
const p0 = Number(p0Match?.[1] ?? 0)
const p1 = Number(p1Match?.[1] ?? 0)

if (p0 > 0 || p1 > 0) {
	console.error(`Chronicle QA failed with P0=${p0}, P1=${p1}`)
	process.exit(1)
}

console.log('Chronicle QA completed. See docs/QA_AUTOMATED_VALIDATION.md')
