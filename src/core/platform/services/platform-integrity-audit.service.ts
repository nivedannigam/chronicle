import { runFinanceIntegrityAudit } from '@/features/finance-knowledge/services/finance-integrity-audit.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { ModuleLifecycleState } from '@/features/modules/contracts/module-ux.contract'
import { MODULE_LIFECYCLE_ALIASES } from '@/features/modules/contracts/module-ux.contract'

export type PlatformModuleId =
	'health' | 'insurance' | 'vehicles' | 'identity' | 'finance' | 'property'

export interface ModuleDocumentIntegrityResult {
	moduleId: PlatformModuleId
	libraryDocumentCount: number
	moduleDocumentCount: number
	discoveredDocumentCount: number
	countsAligned: boolean
	notes: string[]
}

export interface PlatformIntegrityAuditResult {
	generatedAt: string
	modules: ModuleDocumentIntegrityResult[]
	platformFindings: string[]
	navigationFindings: string[]
	askFindings: string[]
	searchFindings: string[]
	liveValidation: 'pending' | 'completed'
}

const MODULE_CATEGORY: Record<PlatformModuleId, string> = {
	health: 'medical',
	insurance: 'insurance',
	vehicles: 'vehicles',
	identity: 'identity',
	finance: 'financial',
	property: 'property',
}

function countLibraryDocuments(
	documents: ChronicleDocument[],
	moduleId: PlatformModuleId,
	selectedMemberId?: string | null,
): number {
	const category = MODULE_CATEGORY[moduleId]

	return documents.filter((document) => {
		if (document.category_id !== category) {
			return false
		}

		if (
			selectedMemberId &&
			document.family_member_id &&
			document.family_member_id !== selectedMemberId
		) {
			return false
		}

		return true
	}).length
}

export function runModuleDocumentIntegrityAudit(input: {
	moduleId: PlatformModuleId
	documents: ChronicleDocument[]
	moduleDocumentCount?: number
	discoveredDocumentCount?: number
	selectedMemberId?: string | null
}): ModuleDocumentIntegrityResult {
	const libraryDocumentCount = countLibraryDocuments(
		input.documents,
		input.moduleId,
		input.selectedMemberId,
	)
	const moduleDocumentCount = input.moduleDocumentCount ?? libraryDocumentCount
	const discoveredDocumentCount =
		input.discoveredDocumentCount ?? libraryDocumentCount

	const notes: string[] = []
	const countsAligned =
		libraryDocumentCount === moduleDocumentCount &&
		moduleDocumentCount === discoveredDocumentCount

	if (libraryDocumentCount !== moduleDocumentCount) {
		notes.push(
			`Library (${libraryDocumentCount}) and module (${moduleDocumentCount}) counts differ.`,
		)
	}

	if (discoveredDocumentCount !== moduleDocumentCount) {
		notes.push(
			`Discovery (${discoveredDocumentCount}) and module (${moduleDocumentCount}) counts differ.`,
		)
	}

	return {
		moduleId: input.moduleId,
		libraryDocumentCount,
		moduleDocumentCount,
		discoveredDocumentCount,
		countsAligned,
		notes,
	}
}

export function runPlatformIntegrityAudit(input: {
	documents: ChronicleDocument[]
	selectedMemberId?: string | null
	moduleDocumentCounts?: Partial<Record<PlatformModuleId, number>>
	financeKnowledge?: Parameters<typeof runFinanceIntegrityAudit>[0]['knowledge']
	userId?: string
	hasFinanceFolderAssigned?: boolean
}): PlatformIntegrityAuditResult {
	const moduleIds: PlatformModuleId[] = [
		'health',
		'insurance',
		'vehicles',
		'identity',
		'finance',
		'property',
	]

	const modules = moduleIds.map((moduleId) =>
		runModuleDocumentIntegrityAudit({
			moduleId,
			documents: input.documents,
			moduleDocumentCount: input.moduleDocumentCounts?.[moduleId],
			selectedMemberId: input.selectedMemberId,
		}),
	)

	const platformFindings: string[] = []
	const navigationFindings: string[] = []
	const askFindings: string[] = []
	const searchFindings: string[] = []

	for (const module of modules) {
		if (!module.countsAligned) {
			platformFindings.push(
				`${module.moduleId}: document counts are not aligned (${module.notes.join(' ')})`,
			)
		}
	}

	navigationFindings.push(
		'Verify /finance/* highlights Modules tab in bottom navigation.',
	)
	askFindings.push(
		'Universal Ask must classify domains before narrative AI and prefer structured evidence for fact, status, and coverage questions.',
	)
	searchFindings.push(
		'Global search must include vehicle knowledge in provider sources.',
	)

	if (
		input.financeKnowledge ||
		input.documents.some((d) => d.category_id === 'financial')
	) {
		const financeAudit = runFinanceIntegrityAudit({
			documents: input.documents.filter(
				(document) => document.category_id === 'financial',
			),
			knowledge: input.financeKnowledge,
			userId: input.userId,
			hasFolderAssigned: input.hasFinanceFolderAssigned ?? false,
		})

		if (financeAudit.findings.snapshotBlockers.length > 0) {
			platformFindings.push(...financeAudit.findings.snapshotBlockers)
		}
	}

	return {
		generatedAt: new Date().toISOString(),
		modules,
		platformFindings,
		navigationFindings,
		askFindings,
		searchFindings,
		liveValidation: input.documents.length > 0 ? 'completed' : 'pending',
	}
}

export function formatPlatformIntegrityAuditReport(
	result: PlatformIntegrityAuditResult,
): string {
	const lines = [
		`Chronicle Platform Integrity Audit · ${result.generatedAt}`,
		'',
		'Module document counts',
		...result.modules.map(
			(module) =>
				`- ${module.moduleId}: library=${module.libraryDocumentCount}, module=${module.moduleDocumentCount}, aligned=${module.countsAligned ? 'yes' : 'no'}`,
		),
		'',
	]

	if (result.platformFindings.length > 0) {
		lines.push(
			'Platform findings',
			...result.platformFindings.map((item) => `- ${item}`),
			'',
		)
	}

	return lines.join('\n')
}

export function resolveHubLifecycleState(
	hubState: keyof typeof MODULE_LIFECYCLE_ALIASES,
): ModuleLifecycleState {
	return MODULE_LIFECYCLE_ALIASES[hubState]
}
