#!/usr/bin/env node
/**
 * Read-only trace of vehicle-related Drive/registry state.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const root = process.cwd()

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

function mask(value) {
	if (!value) return '—'
	const text = String(value)
	if (text.length <= 6) return '[MASKED]'
	return `[MASKED:${text.slice(0, 2)}…${text.slice(-2)}]`
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

	const [
		{ data: connectorFolders },
		{ data: vehicleAssignments },
		{ data: registry },
		{ data: vehicles },
		{ data: vehicleDocuments },
		{ data: motorPolicies },
	] = await Promise.all([
		sb.from('connector_folders').select('*').eq('user_id', userId),
		sb.from('vehicle_folder_assignments').select('*').eq('user_id', userId),
		sb
			.from('connector_document_registry')
			.select('*')
			.eq('user_id', userId)
			.order('folder_path'),
		sb.from('vehicles').select('*').eq('user_id', userId),
		sb.from('vehicle_documents').select('*').eq('user_id', userId),
		sb
			.from('insurance_policies')
			.select('id, policy_type, product_name, expiry_date, policy_number, source_document_ids')
			.eq('user_id', userId)
			.eq('policy_type', 'motor'),
	])

	const vehicleFolders = (connectorFolders ?? []).filter((folder) =>
		/vehicle|xev|car|motor/i.test(
			`${folder.display_name ?? ''} ${folder.alias ?? ''} ${folder.folder_path ?? ''}`,
		),
	)

	const vehicleRegistry = (registry ?? []).filter(
		(row) =>
			row.discovery_category === 'vehicle_document' ||
			row.target_module === 'vehicles' ||
			/vehicle|xev|rc|puc|registration/i.test(
				`${row.folder_path ?? ''} ${row.file_name ?? ''}`,
			),
	)

	const insuranceInVehiclePaths = (registry ?? []).filter((row) =>
		/vehicle|xev/i.test(`${row.folder_path ?? ''}`),
	)

	const report = {
		summary: {
			vehicleRootAssigned: (vehicleAssignments ?? []).length > 0,
			vehicleAssignments: (vehicleAssignments ?? []).length,
			connectorVehicleFolders: vehicleFolders.length,
			vehicleRegistryRows: vehicleRegistry.length,
			vehicles: (vehicles ?? []).length,
			vehicleDocuments: (vehicleDocuments ?? []).length,
			motorPolicies: (motorPolicies ?? []).length,
			registryRowsInVehiclePaths: insuranceInVehiclePaths.length,
		},
		vehicleAssignments: (vehicleAssignments ?? []).map((row) => ({
			id: mask(row.id),
			folderPath: row.folder_path,
			folderId: mask(row.folder_id),
			familyMemberId: mask(row.family_member_id),
		})),
		connectorVehicleFolders: vehicleFolders.map((folder) => ({
			id: mask(folder.id),
			displayName: folder.display_name,
			alias: folder.alias,
			enabled: folder.enabled,
			externalFolderId: mask(folder.external_folder_id),
		})),
		motorPolicies: (motorPolicies ?? []).map((policy) => ({
			id: mask(policy.id),
			productName: policy.product_name,
			expiryDate: policy.expiry_date,
			policyNumber: '[MASKED]',
		})),
		vehicleRegistry: vehicleRegistry.map((row) => ({
			registryId: mask(row.id),
			fileName: row.file_name,
			folderPath: row.folder_path ?? '—',
			discoveryCategory: row.discovery_category,
			targetModule: row.target_module,
			importStatus: row.import_status,
			vehicleDocumentId: row.vehicle_document_id ? mask(row.vehicle_document_id) : null,
		})),
		registryInVehicleLikePaths: insuranceInVehiclePaths.map((row) => ({
			fileName: row.file_name,
			folderPath: row.folder_path ?? '—',
			discoveryCategory: row.discovery_category,
			targetModule: row.target_module,
		})),
	}

	fs.mkdirSync(path.join(root, 'test-results'), { recursive: true })
	fs.writeFileSync(
		path.join(root, 'test-results', 'vehicle-real-data-trace.json'),
		JSON.stringify(report, null, 2),
	)
	console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
	console.error(error.message)
	process.exit(1)
})
