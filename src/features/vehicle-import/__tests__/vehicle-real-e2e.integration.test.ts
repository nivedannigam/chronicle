import { describe, expect, it, vi } from 'vitest'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const shouldRun = process.env.RUN_VEHICLE_E2E === '1'

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

async function snapshot(userId: string) {
	const [
		{ data: assignments },
		{ data: vehicles },
		{ data: documents },
		{ data: registry },
		{ data: policies },
		{ data: runs },
	] = await Promise.all([
		adminClient
			.from('vehicle_folder_assignments')
			.select('folder_path, folder_id')
			.eq('user_id', userId),
		adminClient
			.from('vehicles')
			.select('display_name, slug')
			.eq('user_id', userId),
		adminClient
			.from('vehicle_documents')
			.select('file_name, document_type, status, vehicle_id')
			.eq('user_id', userId),
		adminClient
			.from('connector_document_registry')
			.select(
				'file_name, folder_path, discovery_category, target_module, import_status, import_error',
			)
			.eq('user_id', userId)
			.or('target_module.eq.vehicles,discovery_category.eq.vehicle_document'),
		adminClient
			.from('insurance_policies')
			.select('id, product_name, policy_type')
			.eq('user_id', userId)
			.eq('policy_type', 'motor'),
		adminClient
			.from('vehicle_discovery_runs')
			.select('status, document_count, duplicate_count, error_message')
			.eq('user_id', userId)
			.order('started_at', { ascending: false })
			.limit(3),
	])

	return {
		assignments: assignments ?? [],
		vehicles: vehicles ?? [],
		documents: documents ?? [],
		registry: registry ?? [],
		motorPolicies: policies ?? [],
		runs: runs ?? [],
	}
}

describe.skipIf(!shouldRun)('vehicle real e2e', () => {
	it('runs discovery/import twice and writes snapshot', async () => {
		const { data: owner } = await adminClient
			.from('family_members')
			.select('user_id')
			.eq('is_account_owner', true)
			.limit(1)
			.single()

		const userId = owner!.user_id as string
		const { runVehicleImportSync } =
			await import('@/features/vehicle-import/services/vehicle-import-runner.service')

		const before = await snapshot(userId)
		const run1 = await runVehicleImportSync(userId)
		const afterRun1 = await snapshot(userId)
		const run2 = await runVehicleImportSync(userId, { skipDiscovery: true })
		const afterRun2 = await snapshot(userId)

		const report = { before, run1, afterRun1, run2, afterRun2 }
		mkdirSync('test-results', { recursive: true })
		writeFileSync(
			'test-results/vehicle-real-e2e-run.json',
			JSON.stringify(report, null, 2),
		)

		expect(
			before.assignments.length,
			'Vehicles root must be assigned in DB',
		).toBeGreaterThan(0)
		expect(run1.failed).toBe(0)
		expect(afterRun2.vehicles.length).toBe(afterRun1.vehicles.length)
		expect(afterRun2.documents.length).toBe(afterRun1.documents.length)
		expect(afterRun2.motorPolicies.length).toBe(before.motorPolicies.length)
	}, 120_000)
})
