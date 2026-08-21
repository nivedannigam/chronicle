#!/usr/bin/env node
/**
 * Read-only trace of insurance_policy registry rows vs materialized records.
 * Usage:
 *   node scripts/insurance-real-data-trace.mjs
 *   node scripts/insurance-real-data-trace.mjs --dry-run
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const root = process.cwd()
const envPath = path.join(root, '.env.local')

function loadEnv() {
	const env = {}
	for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) continue
		const idx = trimmed.indexOf('=')
		if (idx === -1) continue
		env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
	}
	return env
}

function mask(value) {
	if (!value) return '—'
	const text = String(value)
	if (text.length <= 6) return '[MASKED]'
	return `[MASKED:${text.slice(0, 2)}…${text.slice(-2)}]`
}

function inferCategoryFromPath(folderPath, fileName) {
	if (!folderPath && !fileName) return 'unknown'
	const haystack = `${folderPath ?? ''} ${fileName ?? ''}`.toLowerCase()
	if (/\bhealth|mediclaim|medical\b/.test(haystack)) return 'health'
	if (/\bterm|life\b/.test(haystack)) return 'life_term'
	if (/\bvehicle|motor|car\b/.test(haystack)) return 'motor'
	if (/\bhome|house|property\b/.test(haystack)) return 'home'
	if (/\btravel\b/.test(haystack)) return 'travel'
	return 'unclassified'
}

async function main() {
	const env = loadEnv()
	const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false },
	})

	const { data: owners } = await sb
		.from('family_members')
		.select('user_id')
		.eq('is_account_owner', true)
		.limit(1)

	const userId = owners[0].user_id

	const { data: registry } = await sb
		.from('connector_document_registry')
		.select('*')
		.eq('user_id', userId)
		.eq('discovery_category', 'insurance_policy')
		.order('file_name')

	const { data: documents } = await sb
		.from('insurance_documents')
		.select('*')
		.eq('user_id', userId)

	const { data: policies } = await sb
		.from('insurance_policies')
		.select('*')
		.eq('user_id', userId)

	const docById = new Map((documents ?? []).map((d) => [d.id, d]))
	const docByRegistry = new Map(
		(documents ?? []).filter((d) => d.registry_id).map((d) => [d.registry_id, d]),
	)
	const policyById = new Map((policies ?? []).map((p) => [p.id, p]))

	const rows = (registry ?? []).map((row, index) => {
		const doc = docByRegistry.get(row.id) ?? docById.get(row.insurance_document_id)
		const parsed = doc?.parsed_data ?? null
		const policyId =
			(typeof parsed?.policyId === 'string' ? parsed.policyId : null) ??
			(doc?.parsed_data?.policyId ?? null)
		const policy =
			(policyId ? policyById.get(policyId) : null) ??
			(policies ?? []).find((p) =>
				(p.source_document_ids ?? []).includes(doc?.id),
			) ??
			null

		return {
			index: index + 1,
			registryId: mask(row.id),
			fileName: row.file_name,
			folderPath: row.folder_path ?? '—',
			inferredCategory: inferCategoryFromPath(row.folder_path, row.file_name),
			importStatus: row.import_status,
			registryStatus: row.registry_status,
			targetModule: row.target_module,
			insuranceDocumentId: doc?.id ? mask(doc.id) : null,
			documentStatus: doc?.status ?? 'missing',
			documentKind: doc?.document_kind ?? '—',
			policyId: policy?.id ? mask(policy.id) : null,
			policyType: policy?.policy_type ?? '—',
			policyCategory: policy?.policy_type ?? '—',
			memberId: mask(row.family_member_id ?? doc?.family_member_id),
			failureReason:
				row.import_status === 'failed'
					? row.discovery_reason ?? 'import failed'
					: doc?.status === 'failed'
						? 'document processing failed'
						: !doc
							? 'not materialized'
							: !policy
								? 'document without policy'
								: null,
		}
	})

	const summary = {
		registryCount: rows.length,
		materializedDocuments: (documents ?? []).length,
		policies: (policies ?? []).length,
		byInferredCategory: rows.reduce((acc, row) => {
			acc[row.inferredCategory] = (acc[row.inferredCategory] ?? 0) + 1
			return acc
		}, {}),
		byPolicyType: (policies ?? []).reduce((acc, p) => {
			acc[p.policy_type] = (acc[p.policy_type] ?? 0) + 1
			return acc
		}, {}),
		notMaterialized: rows.filter((r) => r.documentStatus === 'missing').length,
		withoutPolicy: rows.filter((r) => r.documentStatus !== 'missing' && !r.policyId)
			.length,
	}

	const out = { summary, rows }
	fs.mkdirSync(path.join(root, 'test-results'), { recursive: true })
	fs.writeFileSync(
		path.join(root, 'test-results', 'insurance-real-data-trace.json'),
		JSON.stringify(out, null, 2),
	)
	console.log(JSON.stringify(out, null, 2))
}

main().catch((e) => {
	console.error(e.message)
	process.exit(1)
})
