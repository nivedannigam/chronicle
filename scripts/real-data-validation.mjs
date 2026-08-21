#!/usr/bin/env node
/**
 * Read-only real-data validation against Supabase production data.
 * Does NOT modify data. Masks sensitive identifiers in output.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const root = process.cwd()
const envPath = path.join(root, '.env.local')

function loadEnv() {
	if (!fs.existsSync(envPath)) {
		throw new Error('Missing .env.local')
	}

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
	if (value == null || value === '') return '—'
	const text = String(value)
	if (text.length <= 4) return '[MASKED]'
	return `[MASKED:${text.slice(0, 2)}…${text.slice(-2)}]`
}

function maskName(name) {
	if (!name) return '—'
	const parts = name.split(/\s+/)
	return parts.map((p) => (p.length <= 2 ? p : `${p[0]}${'•'.repeat(Math.min(p.length - 1, 4))}`)).join(' ')
}

const SENSITIVE_PATTERNS = [
	/\b[A-Z]{5}\d{4}[A-Z]\b/gi,
	/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
	/\b[A-Z]{2}\d{2}[A-Z0-9]{10,}\b/gi,
	/\b\d{10,16}\b/g,
]

function scrubText(text) {
	if (!text) return text
	let out = String(text)
	for (const pattern of SENSITIVE_PATTERNS) {
		out = out.replace(pattern, '[MASKED]')
	}
	return out
}

async function fetchAll(supabase, table, select, filter) {
	const pageSize = 1000
	let from = 0
	const rows = []

	while (true) {
		let query = supabase.from(table).select(select).range(from, from + pageSize - 1)
		if (filter) query = filter(query)
		const { data, error } = await query

		if (error) throw new Error(`${table}: ${error.message}`)
		if (!data?.length) break
		rows.push(...data)
		if (data.length < pageSize) break
		from += pageSize
	}

	return rows
}

async function fetchAllOptional(supabase, table, select, filter) {
	try {
		return await fetchAll(supabase, table, select, filter)
	} catch {
		return []
	}
}

function countBy(rows, keyFn) {
	const map = new Map()
	for (const row of rows) {
		const key = keyFn(row) ?? 'unknown'
		map.set(key, (map.get(key) ?? 0) + 1)
	}
	return Object.fromEntries(map.entries())
}

function classifyRegistryStatus(rows) {
	return {
		discovered: rows.filter((r) => r.registry_status === 'discovered').length,
		imported: rows.filter((r) => r.import_status === 'completed').length,
		failed: rows.filter((r) => r.import_status === 'failed').length,
		skipped: rows.filter((r) => r.import_status === 'skipped').length,
		unresolved: rows.filter((r) => !r.discovery_category || r.registry_status === 'unresolved').length,
		processing: rows.filter((r) => r.import_status === 'processing' || r.import_status === 'queued').length,
	}
}

async function main() {
	const env = loadEnv()
	const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
	const key = env.SUPABASE_SERVICE_ROLE_KEY

	if (!url || !key) {
		throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local')
	}

	const supabase = createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false },
	})

	const owners = await fetchAll(
		supabase,
		'family_members',
		'id,user_id,display_name,is_account_owner,relationship,status',
		(q) => q.eq('is_account_owner', true).eq('status', 'active'),
	)

	if (owners.length === 0) {
		throw new Error('No account owner found in family_members')
	}

	const userId = owners[0].user_id
	const ownerName = maskName(owners[0].display_name)

	const members = await fetchAll(
		supabase,
		'family_members',
		'id,user_id,display_name,relationship,is_account_owner,status',
		(q) => q.eq('user_id', userId).eq('status', 'active'),
	)

	const [
		connections,
		folders,
		registry,
		documents,
		healthReports,
		healthMetrics,
		healthAssignments,
		insuranceAssignments,
		vehicleAssignments,
		syncRuns,
		importQueue,
		workflowItems,
		insurancePolicies,
		insuranceDocuments,
		vehicles,
		vehicleDocuments,
	] = await Promise.all([
		fetchAll(supabase, 'connector_connections', '*', (q) => q.eq('user_id', userId)),
		fetchAll(supabase, 'connector_folders', '*', (q) => q.eq('user_id', userId)),
		fetchAll(supabase, 'connector_document_registry', '*', (q) => q.eq('user_id', userId)),
		fetchAll(
			supabase,
			'chronicle_documents',
			'id,category_id,sub_category_id,file_name,title,family_member_id,connector_registry_id,external_file_id,issue_date,expiry_date,status,source,created_at,updated_at,extracted_metadata,knowledge_refs',
			(q) => q.eq('user_id', userId),
		),
		fetchAll(supabase, 'health_reports', '*', (q) => q.eq('user_id', userId)),
		fetchAll(supabase, 'health_metrics', '*', (q) => q.eq('user_id', userId)),
		fetchAll(supabase, 'health_folder_assignments', '*', (q) => q.eq('user_id', userId)),
		fetchAll(supabase, 'insurance_folder_assignments', '*', (q) => q.eq('user_id', userId)),
		fetchAll(supabase, 'vehicle_folder_assignments', '*', (q) => q.eq('user_id', userId)),
		fetchAll(supabase, 'connector_sync_runs', '*', (q) => q.eq('user_id', userId)),
		fetchAll(supabase, 'connector_import_queue', '*', (q) => q.eq('user_id', userId)),
		fetchAll(supabase, 'health_workflow_items', '*', (q) => q.eq('user_id', userId)),
		fetchAllOptional(supabase, 'insurance_policies', '*', (q) => q.eq('user_id', userId)),
		fetchAllOptional(supabase, 'insurance_documents', '*', (q) => q.eq('user_id', userId)),
		fetchAllOptional(supabase, 'vehicles', '*', (q) => q.eq('user_id', userId)),
		fetchAllOptional(supabase, 'vehicle_documents', '*', (q) => q.eq('user_id', userId)),
	])

	const moduleFolders = {
		health: healthAssignments.length,
		insurance: insuranceAssignments.length,
		vehicle: vehicleAssignments.length,
	}

	const docsByCategory = countBy(documents, (d) => d.category_id)
	const registryByCategory = countBy(registry, (r) => r.discovery_category ?? 'uncategorized')
	const registryStats = classifyRegistryStatus(registry)

	const docRegistryIds = new Set(documents.map((d) => d.connector_registry_id).filter(Boolean))

	const registryNotInDocs = registry.filter(
		(r) => r.import_status === 'completed' && r.chronicle_document_id && !documents.some((d) => d.id === r.chronicle_document_id),
	)

	const docsWithoutRegistry = documents.filter(
		(d) => d.connector_registry_id && !registry.some((r) => r.id === d.connector_registry_id),
	)

	const duplicateDocs = Object.entries(
		documents.reduce((acc, doc) => {
			const key = `${doc.category_id}|${doc.file_name}|${doc.family_member_id ?? 'none'}`
			acc[key] = (acc[key] ?? 0) + 1
			return acc
		}, {}),
	).filter(([, count]) => count > 1)

	const reports2026 = healthReports.filter((r) => String(r.report_date ?? '').startsWith('2026'))
	const latestReport = [...healthReports].sort((a, b) =>
		String(b.report_date ?? '').localeCompare(String(a.report_date ?? '')),
	)[0]

	const ldlMetrics = healthMetrics.filter((m) => /ldl/i.test(m.display_name ?? m.raw_name ?? ''))
	const insuranceByType = countBy(insurancePolicies, (p) => p.policy_type ?? 'unknown')
	const insuranceRegistry = registry.filter((r) => r.discovery_category === 'insurance_policy')
	const vehicleDocs = vehicleDocuments.length ? vehicleDocuments : documents.filter((d) => d.category_id === 'vehicles')
	const identityDocs = documents.filter((d) => d.category_id === 'identity')
	const financeDocs = documents.filter((d) => d.category_id === 'financial')
	const propertyDocs = documents.filter((d) => d.category_id === 'property')

	const timelineEvents = await fetchAll(
		supabase,
		'chronicle_timeline_events',
		'id,event_type,module_id,title,occurred_at,family_member_id,source_kind',
		(q) => q.eq('user_id', userId),
	).catch(() => [])

	const technicalTimeline = timelineEvents.filter((e) =>
		/ocr|upload|sync|processing|import|drive|pipeline|extract/i.test(
			`${e.event_type ?? ''} ${e.title ?? ''} ${e.source_kind ?? ''}`,
		),
	)

	const consumerTimeline = timelineEvents.filter((e) => !technicalTimeline.includes(e))

	const factRows = []

	if (latestReport) {
		factRows.push({
			module: 'Health',
			fact: 'Latest lab report date',
			chronicleValue: latestReport.report_date ?? latestReport.uploaded_at?.slice(0, 10) ?? '—',
			sourceDocument: scrubText(latestReport.file_name ?? latestReport.original_file_name ?? '[MASKED report]'),
			sourceDate: latestReport.report_date ?? latestReport.uploaded_at?.slice(0, 10) ?? '—',
			member: maskName(members.find((m) => m.id === latestReport.family_member_id)?.display_name ?? ownerName),
			match: 'DB',
			notes: `processing_status=${latestReport.processing_status ?? latestReport.status ?? '—'}`,
		})
	}

	if (ldlMetrics[0]) {
		const m = ldlMetrics.sort((a, b) => String(b.observed_at).localeCompare(String(a.observed_at)))[0]
		factRows.push({
			module: 'Health',
			fact: 'Latest LDL observation',
			chronicleValue: `${m.value} ${m.unit ?? ''}`.trim(),
			sourceDocument: '[MASKED report]',
			sourceDate: m.observed_at ?? '—',
			member: maskName(members.find((mem) => mem.id === m.family_member_id)?.display_name ?? ownerName),
			match: 'DB',
			notes: `status=${m.status ?? '—'}`,
		})
	}

	for (const [type, count] of Object.entries(insuranceByType)) {
		factRows.push({
			module: 'Insurance',
			fact: `Policies (${type})`,
			chronicleValue: String(count),
			sourceDocument: 'insurance_policies',
			sourceDate: '—',
			member: ownerName,
			match: 'DB',
			notes: `${insuranceRegistry.length} registry insurance_policy files`,
		})
	}

	for (const policy of insurancePolicies.slice(0, 8)) {
		factRows.push({
			module: 'Insurance',
			fact: `${policy.policy_type ?? 'policy'} expiry`,
			chronicleValue: policy.expiry_date ?? policy.renewal_date ?? '—',
			sourceDocument: scrubText(policy.product_name ?? policy.policy_number ?? '[MASKED]'),
			sourceDate: policy.inception_date ?? '—',
			member: maskName(members.find((m) => m.id === policy.family_member_id)?.display_name ?? ownerName),
			match: 'DB',
			notes: `status=${policy.status ?? '—'}`,
		})
	}

	for (const vehicle of vehicles.slice(0, 5)) {
		factRows.push({
			module: 'Vehicles',
			fact: 'Vehicle on file',
			chronicleValue: scrubText(vehicle.display_name ?? vehicle.model ?? vehicle.nickname ?? vehicle.id),
			sourceDocument: 'vehicles',
			sourceDate: vehicle.created_at?.slice(0, 10) ?? '—',
			member: ownerName,
			match: 'DB',
			notes: `${vehicleDocuments.filter((d) => d.vehicle_id === vehicle.id).length} linked docs`,
		})
	}

	const vehicleNames = countBy(vehicleDocs, (d) => d.extracted_metadata?.vehicleName ?? d.sub_category_id ?? 'unknown')
	for (const [vehicle, count] of Object.entries(vehicleNames)) {
		factRows.push({
			module: 'Vehicles',
			fact: `Documents linked to vehicle bucket`,
			chronicleValue: `${scrubText(vehicle)} (${count})`,
			sourceDocument: 'chronicle_documents',
			sourceDate: '—',
			member: ownerName,
			match: 'DB',
			notes: 'Verify entity linkage in UI',
		})
	}

	for (const doc of propertyDocs.slice(0, 3)) {
		factRows.push({
			module: 'Property',
			fact: 'Property document on file',
			chronicleValue: scrubText(doc.title ?? doc.file_name),
			sourceDocument: scrubText(doc.file_name),
			sourceDate: doc.created_at?.slice(0, 10) ?? '—',
			member: maskName(members.find((m) => m.id === doc.family_member_id)?.display_name ?? ownerName),
			match: 'DB',
			notes: doc.sub_category_id ?? '—',
		})
	}

	for (const doc of identityDocs.slice(0, 4)) {
		factRows.push({
			module: 'Identity',
			fact: 'Identity document type',
			chronicleValue: doc.sub_category_id ?? doc.file_name,
			sourceDocument: scrubText(doc.file_name),
			sourceDate: doc.created_at?.slice(0, 10) ?? '—',
			member: maskName(members.find((m) => m.id === doc.family_member_id)?.display_name ?? ownerName),
			match: 'DB',
			notes: 'Raw identifiers not exported',
		})
	}

	for (const doc of financeDocs.slice(0, 3)) {
		factRows.push({
			module: 'Finance',
			fact: 'Finance document',
			chronicleValue: scrubText(doc.title ?? doc.file_name),
			sourceDocument: scrubText(doc.file_name),
			sourceDate: doc.created_at?.slice(0, 10) ?? '—',
			member: maskName(members.find((m) => m.id === doc.family_member_id)?.display_name ?? ownerName),
			match: 'DB',
			notes: scrubText(JSON.stringify(doc.extracted_metadata ?? {})).slice(0, 120),
		})
	}

	const failedReports = healthReports.filter((r) => r.status === 'failed').length
	const libraryHealthCount = healthReports.length - failedReports
	const libraryInsuranceCount =
		insuranceDocuments.length +
		insurancePolicies.length
	const federatedLibraryEstimate = libraryHealthCount + libraryInsuranceCount + vehicleDocuments.length

	const summary = {
		generatedAt: new Date().toISOString(),
		userId: mask(userId),
		ownerName,
		familyMembers: members.length,
		drive: {
			connected: connections.some((c) => c.status === 'connected'),
			folders: folders.length,
			moduleFolderAssignments: moduleFolders,
			registryTotal: registry.length,
			...registryStats,
			lastSync: syncRuns.sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))[0] ?? null,
		},
		inventory: {
			chronicleDocuments: documents.length,
			byCategory: docsByCategory,
			registryByCategory,
			missingImportedInDocs: registryNotInDocs.length,
			docsWithoutRegistryLink: docsWithoutRegistry.length,
			duplicateFileKeys: duplicateDocs.length,
		},
		health: {
			reports: healthReports.length,
			reports2026: reports2026.length,
			metrics: healthMetrics.length,
			workflowItems: workflowItems.length,
		},
		insurance: {
			policies: insurancePolicies.length,
			documents: insuranceDocuments.length,
			byPolicyType: insuranceByType,
			registryInsuranceFiles: insuranceRegistry.length,
		},
		vehicles: {
			vehicles: vehicles.length,
			documents: vehicleDocuments.length,
		},
		identity: { documents: identityDocs.length },
		finance: { documents: financeDocs.length },
		property: { documents: propertyDocs.length },
		timeline: {
			total: timelineEvents.length,
			consumer: consumerTimeline.length,
			technical: technicalTimeline.length,
		},
		importQueue: importQueue.length,
		federatedLibrary: {
			estimatedTotal: federatedLibraryEstimate,
			health: libraryHealthCount,
			insurance: libraryInsuranceCount,
			vehicles: vehicleDocuments.length,
			identity: identityDocs.length,
			finance: financeDocs.length,
			property: propertyDocs.length,
			chronicleDocumentsTable: documents.length,
			note: 'Universal Library uses federated module providers; chronicle_documents is not the primary index.',
		},
		factRows,
	}

	const outJson = path.join(root, 'test-results', 'real-data-validation.json')
	fs.mkdirSync(path.dirname(outJson), { recursive: true })
	fs.writeFileSync(outJson, JSON.stringify(summary, null, 2))

	console.log(JSON.stringify(summary, null, 2))
	console.log(`\nWrote ${outJson}`)
}

main().catch((error) => {
	console.error(error.message)
	process.exit(1)
})
