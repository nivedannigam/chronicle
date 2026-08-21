import { describe, expect, it } from 'vitest'
import {
	buildInsuranceMaterializationPlan,
	isLikelyNonPolicyInsuranceDocument,
	resolveInsuranceMaterializationAction,
	summarizeMaterializationPlan,
} from '@/features/insurance-import/services/insurance-materialization.service'
import {
	inferCategoryFromFolderPath,
	inferInsurerFromFileName,
	resolveInsuranceCategoryHint,
} from '@/features/insurance/services/insurance-folder-discovery.service'
import type { ConnectorDocumentRecord } from '@/core/connectors'

function createRegistryRow(
	overrides: Partial<ConnectorDocumentRecord>,
): ConnectorDocumentRecord {
	return {
		id: 'registry-1',
		userId: 'user-1',
		connectorId: 'google-drive',
		externalFileId: 'file-1',
		fileName: 'Policy.pdf',
		mimeType: 'application/pdf',
		checksum: 'abc',
		fileSize: 1000,
		externalCreatedAt: null,
		externalModifiedAt: null,
		folderId: 'folder-1',
		familyMemberId: null,
		folderPath: 'Insurance/Health',
		discoveryCategory: 'insurance_policy',
		discoveryConfidence: 0.85,
		discoveryReason: 'Insurance folder PDF',
		approvalStatus: 'approved',
		targetModule: 'insurance',
		importStatus: 'discovered',
		registryStatus: 'discovered',
		healthReportId: null,
		insuranceDocumentId: null,
		vehicleDocumentId: null,
		importedAt: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	}
}

describe('insurance materialization planning', () => {
	it('classifies folder paths into canonical categories', () => {
		expect(inferCategoryFromFolderPath('Insurance/Health')).toBe('health')
		expect(inferCategoryFromFolderPath('Insurance/Life')).toBe('life_term')
		expect(inferCategoryFromFolderPath('Insurance/Vehicle')).toBe('motor')
		expect(inferCategoryFromFolderPath('Insurance/Home')).toBe('home')
	})

	it('derives insurer names from filenames', () => {
		expect(inferInsurerFromFileName('HDFC - Health Insurance.pdf')).toBe('HDFC')
		expect(inferInsurerFromFileName('Niva Bupa - Super Top Up.pdf')).toBe(
			'Niva Bupa',
		)
	})

	it('flags informational insurance PDFs for review', () => {
		expect(isLikelyNonPolicyInsuranceDocument('Citi Insurance FAQ.pdf')).toBe(
			true,
		)
	})

	it('plans pending imports for discovered registry rows', () => {
		const plan = buildInsuranceMaterializationPlan({
			registryRows: [
				createRegistryRow({
					id: 'health-1',
					fileName: 'HDFC - Health Insurance.pdf',
					folderPath: 'Insurance/Health',
				}),
				createRegistryRow({
					id: 'motor-1',
					fileName: 'Reliance - XEV 9E Insurance.pdf',
					folderPath: 'Insurance/Vehicle',
					insuranceDocumentId: 'doc-motor',
					importStatus: 'completed',
				}),
			],
			documentsById: new Map([['doc-motor', { status: 'completed' }]]),
		})

		expect(plan).toHaveLength(2)
		expect(plan.find((row) => row.registryId === 'health-1')?.action).toBe(
			'import_and_process',
		)
		expect(plan.find((row) => row.registryId === 'motor-1')?.action).toBe(
			'skip_existing',
		)
	})

	it('plans reprocessing for stuck processing documents', () => {
		const action = resolveInsuranceMaterializationAction({
			registryRow: createRegistryRow({
				id: 'life-1',
				fileName: 'HDFC Term Insurance.pdf',
				folderPath: 'Insurance/Life',
				insuranceDocumentId: 'doc-life',
				importStatus: 'completed',
			}),
			documentStatus: 'processing',
		})

		expect(action.action).toBe('reprocess_stuck')
		expect(action.categoryHint).toBe('life_term')
	})

	it('summarizes planned actions by category', () => {
		const summary = summarizeMaterializationPlan([
			{
				registryId: '1',
				fileName: 'Health.pdf',
				folderPath: 'Insurance/Health',
				categoryHint: 'health',
				action: 'import_and_process',
				reason: 'Pending',
				hasInsuranceDocument: false,
				documentStatus: null,
			},
			{
				registryId: '2',
				fileName: 'Home.pdf',
				folderPath: 'Insurance/Home',
				categoryHint: 'home',
				action: 'import_and_process',
				reason: 'Pending',
				hasInsuranceDocument: false,
				documentStatus: null,
			},
		])

		expect(summary.import_and_process).toBe(2)
		expect(summary.categories.health).toBe(1)
		expect(summary.categories.home).toBe(1)
	})

	it('uses folder path over filename heuristics for category hints', () => {
		expect(
			resolveInsuranceCategoryHint({
				fileName: 'Car Insurance FAQ.pdf',
				folderPath: 'Insurance/Health',
			}),
		).toBe('health')
	})
})

describe('insurance category fixtures', () => {
	const fixtures = [
		{
			fileName: 'Acme Health Policy.pdf',
			folderPath: 'Insurance/Health',
			category: 'health',
		},
		{
			fileName: 'Term Plan.pdf',
			folderPath: 'Insurance/Life',
			category: 'life_term',
		},
		{
			fileName: 'Motor Policy.pdf',
			folderPath: 'Insurance/Vehicle',
			category: 'motor',
		},
		{
			fileName: 'Home Policy.pdf',
			folderPath: 'Insurance/Home',
			category: 'home',
		},
		{
			fileName: 'Family Floater.pdf',
			folderPath: 'Insurance/Health/Family',
			category: 'health',
		},
		{
			fileName: 'Renewal Notice.pdf',
			folderPath: 'Insurance/Vehicle',
			category: 'motor',
		},
		{
			fileName: 'Endorsement.pdf',
			folderPath: 'Insurance/Home',
			category: 'home',
		},
		{
			fileName: 'Unknown Product.pdf',
			folderPath: 'Insurance/Archive',
			category: null,
		},
	]

	it.each(fixtures)(
		'classifies $fileName in $folderPath as $category',
		({ fileName, folderPath, category }) => {
			expect(
				resolveInsuranceCategoryHint({
					fileName,
					folderPath,
				}),
			).toBe(category)
		},
	)
})
