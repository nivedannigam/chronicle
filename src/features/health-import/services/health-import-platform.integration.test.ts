import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runHealthImportJourney } from '@/features/health-import/services/health-import-journey.service'
import type { ImportJourneyProgress } from '@/features/health-import/types/health-import-journey.types'

const mockRunMedicalDiscovery = vi.fn()
const mockApproveAllLikelyMedical = vi.fn()
const mockPrepareImportCandidatesForQueue = vi.fn()
const mockQueueApprovedImports = vi.fn()
const mockProcessImportQueueWithProgress = vi.fn()
const mockListRegistryRecords = vi.fn()
const mockInvalidateHealthKnowledgeCache = vi.fn()
const mockInvalidateAfterHealthImport = vi.fn()
const mockReprocessStuckHealthReports = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock(
	'@/features/medical-discovery/services/medical-discovery-engine.service',
	() => ({
		runMedicalDiscovery: (...args: unknown[]) =>
			mockRunMedicalDiscovery(...args),
	}),
)

vi.mock('@/features/medical-discovery/services/import-review.service', () => ({
	approveAllLikelyMedical: (...args: unknown[]) =>
		mockApproveAllLikelyMedical(...args),
}))

vi.mock(
	'@/features/medical-discovery/services/import-pipeline.service',
	() => ({
		prepareImportCandidatesForQueue: (...args: unknown[]) =>
			mockPrepareImportCandidatesForQueue(...args),
		queueApprovedImports: (...args: unknown[]) =>
			mockQueueApprovedImports(...args),
	}),
)

vi.mock(
	'@/features/health-import/services/health-import-runner.service',
	() => ({
		processImportQueueWithProgress: (...args: unknown[]) =>
			mockProcessImportQueueWithProgress(...args),
	}),
)

vi.mock('@/features/connectors/services/connector-store.service', () => ({
	listRegistryRecords: (...args: unknown[]) => mockListRegistryRecords(...args),
}))

vi.mock('@/features/health-knowledge/services/health-knowledge-cache', () => ({
	invalidateHealthKnowledgeCache: (...args: unknown[]) =>
		mockInvalidateHealthKnowledgeCache(...args),
}))

vi.mock('@/lib/query-invalidation', () => ({
	invalidateAfterHealthImport: (...args: unknown[]) =>
		mockInvalidateAfterHealthImport(...args),
}))

vi.mock('@/features/health/services/health-processing.service', () => ({
	reprocessStuckHealthReports: (...args: unknown[]) =>
		mockReprocessStuckHealthReports(...args),
}))

vi.mock(
	'@/features/health-knowledge/services/health-knowledge.service',
	() => ({
		healthKnowledgeService: {
			getGraphForUser: vi.fn(() => ({
				profile: {
					metricHistories: [
						{ metricId: 'hemoglobin' },
						{ metricId: 'glucose' },
					],
				},
			})),
		},
	}),
)

vi.mock('@/lib/supabase', () => ({
	supabase: {
		from: (...args: unknown[]) => mockSupabaseFrom(...args),
	},
}))

function mockCompletedReportsQuery() {
	const chain = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
	}

	chain.eq.mockImplementation((column: string, value: unknown) => {
		if (column === 'status' && value === 'completed') {
			return Promise.resolve({
				data: [
					{
						id: 'report-1',
						user_id: 'user-1',
						file_name: 'lab.pdf',
						status: 'completed',
					},
				],
				error: null,
			})
		}

		return chain
	})

	mockSupabaseFrom.mockReturnValue(chain)
}

describe('health import platform regression', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		mockRunMedicalDiscovery.mockResolvedValue({
			run: {
				filesScanned: 3,
				medicalCount: 1,
				reviewCount: 1,
				ignoredCount: 0,
				duplicateCount: 1,
			},
		})
		mockApproveAllLikelyMedical.mockResolvedValue(1)
		mockPrepareImportCandidatesForQueue.mockResolvedValue(undefined)
		mockQueueApprovedImports.mockResolvedValue(undefined)
		mockProcessImportQueueWithProgress.mockImplementation(
			async (_userId, options) => {
				await options?.onImportPhase?.('download')
				await options?.onImportPhase?.('ocr')
				await options?.onImportPhase?.('metrics')
				await options?.onDocumentProgress?.()

				return {
					importedThisRun: 1,
					failedThisRun: 0,
					skippedThisRun: 0,
				}
			},
		)
		mockListRegistryRecords.mockResolvedValue([
			{
				id: 'registry-1',
				importStatus: 'completed',
				errorMessage: null,
			},
		])
		mockCompletedReportsQuery()
		mockReprocessStuckHealthReports.mockResolvedValue({
			processed: 0,
			failed: 0,
			succeeded: 0,
		})
	})

	it('runs assign → scan → review → approve → OCR → parser → metrics → summary', async () => {
		const progress: ImportJourneyProgress[] = []

		const result = await runHealthImportJourney(
			'user-1',
			['folder-1'],
			(update) => {
				progress.push(update)
			},
		)

		expect(mockRunMedicalDiscovery).toHaveBeenCalledWith({
			userId: 'user-1',
			mode: 'manual',
			folderIds: ['folder-1'],
		})
		expect(mockApproveAllLikelyMedical).toHaveBeenCalledWith('user-1')
		expect(mockPrepareImportCandidatesForQueue).toHaveBeenCalledWith('user-1')
		expect(mockQueueApprovedImports).toHaveBeenCalledWith('user-1')
		expect(mockProcessImportQueueWithProgress).toHaveBeenCalled()

		expect(result.outcome).toBe('success')
		expect(result.importedThisRun).toBe(1)
		expect(result.metricsExtracted).toBe(2)
		expect(result.phasesCompleted).toEqual(
			expect.arrayContaining([
				'assign',
				'scanning',
				'detection',
				'download',
				'ocr',
				'metrics',
				'summary',
			]),
		)
		expect(result.phasesSucceeded).toEqual(
			expect.arrayContaining([
				'scanning',
				'download',
				'ocr',
				'metrics',
				'summary',
			]),
		)

		const finalProgress = progress.at(-1)
		expect(finalProgress?.phase).toBe('summary')
		expect(mockInvalidateHealthKnowledgeCache).toHaveBeenCalled()
		expect(mockInvalidateAfterHealthImport).toHaveBeenCalled()
	})

	it('returns no_reports when discovery finds only duplicates', async () => {
		mockRunMedicalDiscovery.mockResolvedValue({
			run: {
				filesScanned: 1,
				medicalCount: 0,
				reviewCount: 0,
				ignoredCount: 0,
				duplicateCount: 1,
			},
		})

		const result = await runHealthImportJourney('user-1', ['folder-1'], vi.fn())

		expect(result.outcome).toBe('no_reports')
		expect(result.importCandidates).toBe(0)
		expect(mockProcessImportQueueWithProgress).not.toHaveBeenCalled()
		expect(mockReprocessStuckHealthReports).toHaveBeenCalled()
	})

	it('reprocesses stuck reports when discovery finds no new candidates', async () => {
		mockRunMedicalDiscovery.mockResolvedValue({
			run: {
				filesScanned: 1,
				medicalCount: 0,
				reviewCount: 0,
				ignoredCount: 0,
				duplicateCount: 1,
			},
		})
		mockReprocessStuckHealthReports.mockResolvedValue({
			processed: 1,
			failed: 0,
			succeeded: 1,
		})

		const result = await runHealthImportJourney('user-1', ['folder-1'], vi.fn())

		expect(result.outcome).toBe('success')
		expect(result.importedThisRun).toBe(1)
		expect(mockReprocessStuckHealthReports).toHaveBeenCalled()
	})

	it('does not mark pipeline phases failed when queue has no pending imports', async () => {
		mockProcessImportQueueWithProgress.mockResolvedValue({
			importedThisRun: 0,
			failedThisRun: 0,
			skippedThisRun: 0,
		})

		const result = await runHealthImportJourney('user-1', ['folder-1'], vi.fn())

		expect(result.outcome).toBe('candidates_found')
		expect(result.phasesCompleted).not.toContain('download')
		expect(result.phasesCompleted).not.toContain('ocr')
		expect(result.phasesCompleted).not.toContain('metrics')
		expect(result.phasesSucceeded).toContain('summary')
	})

	it('marks summary failed when import pipeline stages fail', async () => {
		mockProcessImportQueueWithProgress.mockImplementation(
			async (_userId, options) => {
				options?.onImportPhase?.('download')
				return {
					importedThisRun: 0,
					failedThisRun: 1,
					skippedThisRun: 0,
				}
			},
		)
		mockListRegistryRecords.mockResolvedValue([
			{
				id: 'registry-1',
				importStatus: 'failed',
				errorMessage: 'Download failed',
			},
		])

		const result = await runHealthImportJourney('user-1', ['folder-1'], vi.fn())

		expect(result.outcome).toBe('failed')
		expect(result.phasesCompleted).toContain('download')
		expect(result.phasesSucceeded).not.toContain('download')
		expect(result.phasesSucceeded).not.toContain('summary')
	})
})
