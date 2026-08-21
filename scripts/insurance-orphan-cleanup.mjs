#!/usr/bin/env node
/**
 * Identify and optionally remove orphan insurance policies created by
 * pre-fix folder-path misclassification (home docs typed as health).
 *
 * Usage:
 *   node scripts/insurance-orphan-cleanup.mjs           # audit only
 *   node scripts/insurance-orphan-cleanup.mjs --apply   # delete verified orphans
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const root = process.cwd()
const apply = process.argv.includes('--apply')

function loadEnv() {
	const env = {}
	for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) continue
		const idx = trimmed.indexOf('=')
		if (idx === -1) continue
		env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
	}
	return env
}

function inferFolderCategory(folderPath) {
	if (!folderPath) return null
	const haystack = folderPath.toLowerCase()
	if (/\bhealth\b/.test(haystack)) return 'health'
	if (/\blife\b|\bterm\b/.test(haystack)) return 'life_term'
	if (/\bvehicle\b|\bmotor\b/.test(haystack)) return 'motor'
	if (/\bhome\b|\bproperty\b/.test(haystack)) return 'home'
	return null
}

function mapPolicyTypeToCategory(policyType) {
	switch (policyType) {
		case 'health':
			return 'health'
		case 'life_term':
			return 'life_term'
		case 'motor':
			return 'motor'
		case 'home':
			return 'home'
		default:
			return null
	}
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

	const [{ data: policies }, { data: documents }, { data: registry }] =
		await Promise.all([
			sb.from('insurance_policies').select('*').eq('user_id', userId),
			sb.from('insurance_documents').select('*').eq('user_id', userId),
			sb
				.from('connector_document_registry')
				.select('id, file_name, folder_path, insurance_document_id')
				.eq('user_id', userId)
				.eq('discovery_category', 'insurance_policy'),
		])

	const docById = new Map((documents ?? []).map((doc) => [doc.id, doc]))
	const registryByDocId = new Map(
		(registry ?? [])
			.filter((row) => row.insurance_document_id)
			.map((row) => [row.insurance_document_id, row]),
	)

	const policiesByDocument = new Map()

	for (const policy of policies ?? []) {
		for (const documentId of policy.source_document_ids ?? []) {
			const bucket = policiesByDocument.get(documentId) ?? []
			bucket.push(policy)
			policiesByDocument.set(documentId, bucket)
		}
	}

	const orphans = []

	for (const [documentId, linkedPolicies] of policiesByDocument.entries()) {
		if (linkedPolicies.length < 2) continue

		const doc = docById.get(documentId)
		const registryRow = registryByDocId.get(documentId)
		const folderCategory = inferFolderCategory(registryRow?.folder_path ?? null)

		if (folderCategory !== 'home') continue

		const canonical = linkedPolicies.find(
			(policy) => mapPolicyTypeToCategory(policy.policy_type) === folderCategory,
		)
		const misclassified = linkedPolicies.filter(
			(policy) =>
				policy.policy_type === 'health' &&
				mapPolicyTypeToCategory(policy.policy_type) !== folderCategory,
		)

		for (const orphan of misclassified) {
			const parsedPolicyId =
				typeof doc?.parsed_data?.policyId === 'string'
					? doc.parsed_data.policyId
					: null

			orphans.push({
				policyId: orphan.id,
				policyType: orphan.policy_type,
				productName: orphan.product_name,
				policyNumber: orphan.policy_number,
				sourceDocumentId: documentId,
				sourceFileName: doc?.file_name ?? registryRow?.file_name ?? 'unknown',
				folderPath: registryRow?.folder_path ?? null,
				reason:
					'Pre-fix misclassification: home folder document received a health-typed duplicate policy before folder-path priority fix.',
				replacementPolicyId: canonical?.id ?? null,
				replacementPolicyType: canonical?.policy_type ?? null,
				referencedByDocumentParsedData: parsedPolicyId === orphan.id,
				referencedByCanonicalPolicy: Boolean(canonical),
			})
		}
	}

	const safetyChecks = []

	for (const orphan of orphans) {
		const referencedByDocs = (documents ?? []).filter((doc) => {
			const parsedPolicyId =
				typeof doc.parsed_data?.policyId === 'string'
					? doc.parsed_data.policyId
					: null
			return parsedPolicyId === orphan.policyId
		})

		const { count: claimCount } = await sb
			.from('insurance_claims')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', userId)
			.eq('policy_id', orphan.policyId)

		const { count: memberCount } = await sb
			.from('insurance_members')
			.select('*', { count: 'exact', head: true })
			.eq('policy_id', orphan.policyId)

		const { count: coverageCount } = await sb
			.from('insurance_coverage')
			.select('*', { count: 'exact', head: true })
			.eq('policy_id', orphan.policyId)

		safetyChecks.push({
			...orphan,
			referencedByDocumentCount: referencedByDocs.length,
			referencedByDocuments: referencedByDocs.map((doc) => ({
				id: doc.id,
				fileName: doc.file_name,
				status: doc.status,
			})),
			claimCount: claimCount ?? 0,
			memberCount: memberCount ?? 0,
			coverageCount: coverageCount ?? 0,
			safeToDelete:
				referencedByDocs.length === 0 &&
				(claimCount ?? 0) === 0 &&
				(memberCount ?? 0) === 0 &&
				(coverageCount ?? 0) === 0 &&
				Boolean(orphan.replacementPolicyId),
		})
	}

	const deletions = []

	if (apply) {
		for (const orphan of safetyChecks) {
			if (!orphan.safeToDelete) {
				throw new Error(
					`Refusing to delete unsafe orphan policy ${orphan.policyId}`,
				)
			}

			const { error } = await sb
				.from('insurance_policies')
				.delete()
				.eq('id', orphan.policyId)
				.eq('user_id', userId)

			if (error) {
				throw new Error(error.message)
			}

			deletions.push(orphan.policyId)
		}
	}

	const report = {
		mode: apply ? 'apply' : 'audit',
		orphanCandidates: safetyChecks.length,
		safeToDelete: safetyChecks.filter((row) => row.safeToDelete).length,
		orphans: safetyChecks,
		deletedPolicyIds: deletions,
	}

	fs.mkdirSync(path.join(root, 'test-results'), { recursive: true })
	fs.writeFileSync(
		path.join(root, 'test-results', 'insurance-orphan-cleanup.json'),
		JSON.stringify(report, null, 2),
	)

	console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
	console.error(error.message)
	process.exit(1)
})
