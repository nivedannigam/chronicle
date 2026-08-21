import { describe, expect, it } from 'vitest'
import { financeModuleProvider } from '@/core/platform/providers/finance-module.provider'
import { buildFinanceHubCard } from '@/features/modules/services/module-hub-status.service'
import {
	buildFinanceKnowledge,
	getFinanceSubCategoryLabel,
	maskAccountIdentifier,
	maskFinanceIdentifier,
	readFinancePreferences,
	resolveFinanceSubCategoryId,
} from '@/features/finance-knowledge'
import type { FinanceOwnership } from '@/features/finance-knowledge/types/finance-knowledge.types'
import { resolveModuleFolderAssignmentForFile } from '@/features/connectors/services/module-folder-assignment-resolver'
import { resolveDocumentModuleLinks } from '@/features/documents/services/document-module-links.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { ROUTES } from '@/constants/routes'
import { getLifeModuleById } from '@/constants/modules'

function makeFinanceDocument(input: {
	id: string
	fileName: string
	folderPath: string
	subCategoryId?: string | null
}): ChronicleDocument {
	return {
		id: input.id,
		user_id: 'user-1',
		title: input.fileName,
		file_name: input.fileName,
		category_id: 'financial',
		sub_category_id: input.subCategoryId ?? null,
		status: 'active',
		family_member_id: null,
		uploaded_at: '2026-01-15T00:00:00.000Z',
		extracted_metadata: { folderPath: input.folderPath },
		extracted_text: null,
		knowledge_refs: [],
		mime_type: 'application/pdf',
	} as ChronicleDocument
}

const FINANCE_FIXTURE_PATHS = [
	'Finance/Bank/HDFC/statement.pdf',
	'Finance/Investments/Mutual Funds/statement.pdf',
	'Finance/Loans/Home Loan/statement.pdf',
	'Finance/Credit Cards/HDFC Infinia/statement.pdf',
	'Finance/Tax/ITR/itr.pdf',
] as const

describe('buildFinanceKnowledge', () => {
	it('returns empty canonical state when no folder is connected', () => {
		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents: [],
			members: [],
			hasFolderAssigned: false,
		})

		expect(knowledge.setupStatus).toBe('not_connected')
		expect(knowledge.summary.netWorthKnown).toBeNull()
		expect(knowledge.summary.assetTotalKnown).toBeNull()
		expect(knowledge.summary.liabilityTotalKnown).toBeNull()
		expect(knowledge.bankAccounts).toEqual([])
		expect(knowledge.investmentAccounts).toEqual([])
		expect(knowledge.creditCards).toEqual([])
		expect(knowledge.loans).toEqual([])
		expect(knowledge.taxRecords).toEqual([])
		expect(knowledge.attention).toEqual([])
	})

	it('enters ready state when documents exist under a connected folder', () => {
		const documents = FINANCE_FIXTURE_PATHS.map((filePath, index) =>
			makeFinanceDocument({
				id: `doc-${index}`,
				fileName: filePath.split('/').pop() ?? 'statement.pdf',
				folderPath: filePath.split('/').slice(0, -1).join('/'),
			}),
		)

		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents,
			members: [],
			hasFolderAssigned: true,
		})

		expect(knowledge.setupStatus).toBe('ready')
		expect(knowledge.documentCount).toBe(5)
		expect(knowledge.summary.bankAccountCount).toBe(0)
		expect(knowledge.summary.netWorthKnown).toBeNull()
		expect(knowledge.summary.documentTypeCounts.length).toBeGreaterThan(0)
	})
})

describe('Finance document taxonomy', () => {
	it('classifies fixture paths into expected subcategories', () => {
		expect(
			resolveFinanceSubCategoryId({
				fileName: 'statement.pdf',
				folderPath: 'Finance/Bank/HDFC',
			}),
		).toBe('bank-statement')
		expect(
			resolveFinanceSubCategoryId({
				fileName: 'statement.pdf',
				folderPath: 'Finance/Investments/Mutual Funds',
			}),
		).toBe('investment-statement')
		expect(
			resolveFinanceSubCategoryId({
				fileName: 'statement.pdf',
				folderPath: 'Finance/Loans/Home Loan',
			}),
		).toBe('loan-statement')
		expect(
			resolveFinanceSubCategoryId({
				fileName: 'statement.pdf',
				folderPath: 'Finance/Credit Cards/HDFC Infinia',
			}),
		).toBe('credit-card-statement')
		expect(
			resolveFinanceSubCategoryId({
				fileName: 'itr.pdf',
				folderPath: 'Finance/Tax/ITR',
			}),
		).toBe('tax-record')
	})

	it('falls back to other for unknown financial documents', () => {
		expect(
			resolveFinanceSubCategoryId({
				fileName: 'misc.pdf',
				folderPath: 'Finance/Archive',
			}),
		).toBe('other')
		expect(getFinanceSubCategoryLabel('other')).toBe('Other')
	})
})

describe('recursive Finance folder assignment', () => {
	const financeAssignment = {
		id: 'finance-1',
		externalFolderId: 'drive-finance-root',
		folderName: 'Finance',
		folderPath: 'Finance',
	}

	it('captures all nested fixture paths from one Finance root assignment', () => {
		for (const filePath of FINANCE_FIXTURE_PATHS) {
			const resolved = resolveModuleFolderAssignmentForFile(
				{
					folderExternalId: 'nested-folder',
					folderPath: filePath.split('/').slice(0, -1).join('/'),
				},
				[financeAssignment],
			)

			expect(resolved?.id).toBe('finance-1')
		}
	})
})

describe('Finance document routing', () => {
	it('routes financial documents to Finance module', () => {
		const links = resolveDocumentModuleLinks(
			makeFinanceDocument({
				id: 'doc-1',
				fileName: 'statement.pdf',
				folderPath: 'Finance/Bank/HDFC',
			}),
		)

		expect(links).toEqual([
			{ moduleId: 'finance', label: 'Finance', route: ROUTES.finance },
		])
	})
})

describe('Finance ownership types', () => {
	it('supports explicit ownership values on entity base shape', () => {
		const ownershipValues: FinanceOwnership[] = [
			'individual',
			'joint',
			'family',
			'unknown',
		]

		expect(ownershipValues).toContain('unknown')
		expect(ownershipValues.length).toBe(4)
	})
})

describe('sensitive identifier masking', () => {
	it('masks account numbers by default preference', () => {
		expect(maskAccountIdentifier('123456789012')).toBe('•••• 9012')

		const preferences = readFinancePreferences('test-user')
		expect(preferences.maskAccountNumbers).toBe(true)
		expect(maskFinanceIdentifier('123456789012', preferences)).toBe('•••• 9012')
	})
})

describe('buildFinanceHubCard', () => {
	it('shows setup state when folder is not connected', () => {
		const card = buildFinanceHubCard({
			setupStatus: 'not_connected',
			documentCount: 0,
		})

		expect(card.state).toBe('setup_required')
		expect(card.statusLine).toBe('Connect your Finance folder')
		expect(card.statusLine).not.toMatch(/₹|net worth|0/)
	})

	it('does not show financial totals when ready', () => {
		const card = buildFinanceHubCard({
			setupStatus: 'ready',
			documentCount: 3,
			statusHeadline: 'Your financial picture is taking shape',
		})

		expect(card.statusLine).not.toMatch(/₹|net worth/)
	})
})

describe('financeModuleProvider', () => {
	it('exposes Finance documents in Library without fake totals', () => {
		const documents = [
			makeFinanceDocument({
				id: 'doc-bank',
				fileName: 'statement.pdf',
				folderPath: 'Finance/Bank/HDFC',
			}),
		]

		const section = financeModuleProvider.getDocumentSection({
			userId: 'user-1',
			sources: { documents: { uploadedDocuments: documents } },
		})

		expect(section?.moduleId).toBe('finance')
		expect(section?.totalCount).toBe(1)

		const summary = financeModuleProvider.getSummary?.({
			userId: 'user-1',
			sources: { documents: { uploadedDocuments: documents } },
		})

		expect(summary?.headline).toBeNull()
	})
})

describe('Finance module registry', () => {
	it('promotes Finance from coming soon when route is available', () => {
		const financeModule = getLifeModuleById('finance')

		expect(financeModule?.status).toBe('available')
		expect(financeModule?.route).toBe(ROUTES.finance)
		expect(financeModule?.description).toBe(
			'Keep your financial life organized',
		)
	})
})
