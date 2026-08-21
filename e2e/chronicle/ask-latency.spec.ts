import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { prepareQaFullDataset } from './helpers'
import { getAskInput, getAskSendButton, waitForAskReady } from './ask-helpers'

const LATENCY_QUESTIONS = [
	'What is my LDL?',
	'When does my car insurance expire?',
	'What is my home loan balance?',
	'When does my passport expire?',
	'When did I buy my Pune home?',
	'Show me everything about my XEV 9e.',
] as const

export interface AskLatencyMeasurement {
	question: string
	timeToAnswerMs: number
	timeToEvidenceMs: number | null
	totalDurationMs: number
	classification: string
	provider: string | null
	routing: string | null
	engineTimingMs: number | null
}

function classifyLatency(ms: number): string {
	if (ms < 10_000) return 'excellent'
	if (ms < 20_000) return 'acceptable'
	if (ms < 30_000) return 'noticeable'
	if (ms < 60_000) return 'poor'
	return 'unacceptable'
}

async function measureAskLatency(
	page: import('@playwright/test').Page,
	question: string,
): Promise<AskLatencyMeasurement> {
	await waitForAskReady(page)
	await getAskInput(page).fill(question)

	const startedAt = Date.now()
	await getAskSendButton(page).click()

	const conversation = page.getByRole('log', { name: 'Conversation' })
	let timeToAnswerMs = 0

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

				if (lines.length >= 2 && timeToAnswerMs === 0) {
					timeToAnswerMs = Date.now() - startedAt
				}

				return lines.length >= 2
			},
			{ timeout: 90_000 },
		)
		.toBe(true)

	if (timeToAnswerMs === 0) {
		timeToAnswerMs = Date.now() - startedAt
	}

	let timeToEvidenceMs: number | null = null
	const evidence = page.getByText(/^Evidence\s*\(\d+\)/i)

	try {
		await expect
			.poll(
				async () => {
					if ((await evidence.count()) === 0) {
						return false
					}

					if (timeToEvidenceMs === null) {
						timeToEvidenceMs = Date.now() - startedAt
					}

					return true
				},
				{ timeout: 5_000 },
			)
			.toBe(true)
	} catch {
		timeToEvidenceMs = null
	}

	const totalDurationMs = Date.now() - startedAt
	const debug = await page.evaluate(() =>
		window.__CHRONICLE_QA__?.getLastAskDebug?.(),
	)

	return {
		question,
		timeToAnswerMs,
		timeToEvidenceMs,
		totalDurationMs,
		classification: classifyLatency(totalDurationMs),
		provider: debug?.provider ?? null,
		routing: debug?.routing ?? null,
		engineTimingMs:
			typeof debug?.timingMs === 'number' ? Math.round(debug.timingMs) : null,
	}
}

const measurements: AskLatencyMeasurement[] = []

test.describe('Ask latency diagnostics', () => {
	test.describe.configure({ mode: 'serial' })
	test.setTimeout(120_000)

	test.beforeEach(async ({ page }) => {
		await prepareQaFullDataset(page)
	})

	for (const question of LATENCY_QUESTIONS) {
		test(`latency: ${question}`, async ({ page }) => {
			try {
				const result = await measureAskLatency(page, question)
				measurements.push(result)

				await test.info().attach(`latency-${question.slice(0, 24)}`, {
					body: JSON.stringify(result, null, 2),
					contentType: 'application/json',
				})
			} catch {
				const timedOut: AskLatencyMeasurement = {
					question,
					timeToAnswerMs: 0,
					timeToEvidenceMs: null,
					totalDurationMs: 90_000,
					classification: 'unacceptable',
					provider: null,
					routing: null,
					engineTimingMs: null,
				}
				measurements.push(timedOut)

				await test.info().attach(`latency-${question.slice(0, 24)}`, {
					body: JSON.stringify(timedOut, null, 2),
					contentType: 'application/json',
				})
			}
		})
	}

	test.afterAll(() => {
		const reportPath = path.join(process.cwd(), 'docs', 'ASK_LATENCY_REPORT.md')
		const lines = [
			'# Ask Latency Report (QA Grounded)',
			'',
			`Generated: ${new Date().toISOString()}`,
			'',
			'Diagnostic thresholds: <10s excellent · 10–20s acceptable · 20–30s noticeable · 30–60s poor · >60s unacceptable',
			'',
			'| Question | Answer (ms) | Evidence (ms) | Total (ms) | Class | Provider | Routing | Engine (ms) |',
			'| --- | ---: | ---: | ---: | --- | --- | --- | ---: |',
		]

		for (const row of measurements) {
			lines.push(
				`| ${row.question} | ${row.timeToAnswerMs} | ${row.timeToEvidenceMs ?? '—'} | ${row.totalDurationMs} | ${row.classification} | ${row.provider ?? '—'} | ${row.routing ?? '—'} | ${row.engineTimingMs ?? '—'} |`,
			)
		}

		lines.push('', '## Root-cause notes', '')

		const slow = measurements.filter((row) => row.totalDurationMs > 30_000)

		if (slow.length === 0) {
			lines.push('_No queries exceeded 30s in this run._')
		} else {
			for (const row of slow) {
				const bottleneck =
					row.totalDurationMs >= 90_000
						? 'timeout — likely companion AI / Gemini narrative path or stuck streaming state'
						: row.provider?.includes('gemini') ||
							  row.provider?.includes('companion')
							? 'AI provider call'
							: row.provider === 'fact-lookup' ||
								  row.provider === 'structured-universal'
								? 'retrieval/structured path'
								: 'pipeline + rendering'

				lines.push(
					`- **${row.question}** (${row.totalDurationMs}ms): provider=${row.provider ?? 'unknown'}, routing=${row.routing ?? 'unknown'}. Likely bottleneck: ${bottleneck}.`,
				)
			}
		}

		fs.mkdirSync(path.dirname(reportPath), { recursive: true })
		fs.writeFileSync(reportPath, lines.join('\n'))
	})
})
