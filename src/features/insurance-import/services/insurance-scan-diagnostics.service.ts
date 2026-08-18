import { supabase } from '@/lib/supabase'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { isInsuranceRegistryRow } from '@/features/connectors/services/registry-module-routing.service'
import { inferCategoryFromFolderPath } from '@/features/insurance/services/insurance-folder-discovery.service'
import { mapPolicyTypeToCategoryId } from '@/features/insurance-knowledge/graph/policy-categories'

export interface InsuranceScanCategoryCounts {
	discovered: number
	registered: number
	classified: Record<string, number>
	extracted: Record<string, number>
	knowledge: { total: number; active: number }
}

export interface InsuranceScanDiagnostics {
	rootFolders: string[]
	categories: Record<string, InsuranceScanCategoryCounts>
}

function incrementCount(
	target: Record<string, number>,
	key: string,
	amount = 1,
): void {
	target[key] = (target[key] ?? 0) + amount
}

/** Development-only insurance pipeline diagnostics. */
export async function buildInsuranceScanDiagnostics(
	userId: string,
): Promise<InsuranceScanDiagnostics> {
	const [{ data: assignments }, registry, { data: policies }] =
		await Promise.all([
			supabase
				.from('insurance_source_assignments')
				.select('folder_name, folder_path')
				.eq('user_id', userId),
			listRegistryRecords(userId, 'google-drive'),
			supabase
				.from('insurance_policies')
				.select('policy_type, status')
				.eq('user_id', userId),
		])

	const rootFolders = (assignments ?? []).map(
		(row) => (row.folder_path as string | null) ?? (row.folder_name as string),
	)
	const insuranceRows = registry.filter((row) => isInsuranceRegistryRow(row))
	const categories: InsuranceScanDiagnostics['categories'] = {}

	for (const row of insuranceRows) {
		const categoryId =
			inferCategoryFromFolderPath(row.folderPath) ?? 'unclassified'
		const bucket = categories[categoryId] ?? {
			discovered: 0,
			registered: 0,
			classified: {},
			extracted: {},
			knowledge: { total: 0, active: 0 },
		}

		bucket.discovered += 1
		bucket.registered += 1
		incrementCount(bucket.classified, categoryId)
		categories[categoryId] = bucket
	}

	for (const row of policies ?? []) {
		const categoryId = mapPolicyTypeToCategoryId(
			row.policy_type as import('@/features/insurance-knowledge/types/insurance-record.types').InsurancePolicyType,
		)
		const bucket = categories[categoryId] ?? {
			discovered: 0,
			registered: 0,
			classified: {},
			extracted: {},
			knowledge: { total: 0, active: 0 },
		}

		bucket.knowledge.total += 1
		incrementCount(bucket.extracted, categoryId)

		if (row.status === 'active') {
			bucket.knowledge.active += 1
		}

		categories[categoryId] = bucket
	}

	return { rootFolders, categories }
}

export function logInsuranceScanDiagnostics(
	diagnostics: InsuranceScanDiagnostics,
) {
	if (!import.meta.env.DEV) {
		return
	}

	console.log(
		JSON.stringify({
			service: 'insurance-scan-diagnostics',
			rootFolders: diagnostics.rootFolders,
			categories: diagnostics.categories,
		}),
	)
}
