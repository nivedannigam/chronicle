import { describe, expect, it, vi } from 'vitest'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const shouldRun = process.env.RUN_INSURANCE_MATERIALIZE === '1'

const { adminClient } = vi.hoisted(() => {
	const envPath = `${process.cwd()}/.env.local`
	const env: Record<string, string> = {}

	for (const line of readFileSync(envPath, 'utf8').split('\n')) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) continue
		const idx = trimmed.indexOf('=')
		if (idx === -1) continue
		env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
	}

	return {
		adminClient: createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		}),
	}
})

vi.mock('@/lib/supabase', () => ({
	supabase: adminClient,
}))

async function loadCounts(userId: string) {
	const [{ count: registryCount }, { data: documents }, { data: policies }] =
		await Promise.all([
			adminClient
				.from('connector_document_registry')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', userId)
				.eq('discovery_category', 'insurance_policy'),
			adminClient
				.from('insurance_documents')
				.select('status')
				.eq('user_id', userId),
			adminClient
				.from('insurance_policies')
				.select('policy_type')
				.eq('user_id', userId),
		])

	const byPolicyType = (policies ?? []).reduce<Record<string, number>>(
		(acc, row) => {
			const key = row.policy_type as string
			acc[key] = (acc[key] ?? 0) + 1
			return acc
		},
		{},
	)

	return {
		registryCount: registryCount ?? 0,
		documentCount: documents?.length ?? 0,
		policyCount: policies?.length ?? 0,
		byPolicyType,
		documentStatuses: (documents ?? []).reduce<Record<string, number>>(
			(acc, row) => {
				const key = row.status as string
				acc[key] = (acc[key] ?? 0) + 1
				return acc
			},
			{},
		),
	}
}

describe.skipIf(!shouldRun)('insurance real materialization', () => {
	it('runs import sync twice without duplicate growth', async () => {
		const { data: owner } = await adminClient
			.from('family_members')
			.select('user_id')
			.eq('is_account_owner', true)
			.single()

		expect(owner?.user_id).toBeTruthy()

		const userId = owner!.user_id as string
		const before = await loadCounts(userId)
		const { runInsuranceImportSync } =
			await import('@/features/insurance-import/services/insurance-import-runner.service')

		const firstRun = await runInsuranceImportSync(userId, {
			skipDiscovery: true,
		})
		const afterFirst = await loadCounts(userId)
		const secondRun = await runInsuranceImportSync(userId, {
			skipDiscovery: true,
		})
		const afterSecond = await loadCounts(userId)

		mkdirSync(path.join(process.cwd(), 'test-results'), { recursive: true })
		writeFileSync(
			path.join(
				process.cwd(),
				'test-results',
				'insurance-materialization-run.json',
			),
			JSON.stringify(
				{ before, afterFirst, afterSecond, firstRun, secondRun },
				null,
				2,
			),
		)

		expect(afterFirst.documentCount).toBeGreaterThanOrEqual(
			before.documentCount,
		)
		expect(afterSecond.documentCount).toBe(afterFirst.documentCount)
		expect(afterSecond.policyCount).toBe(afterFirst.policyCount)
	}, 300_000)
})
