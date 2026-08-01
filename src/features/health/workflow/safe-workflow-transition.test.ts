import { beforeEach, describe, expect, it, vi } from 'vitest'
import { safeTransitionWorkflowItem } from '@/features/health/workflow/safe-workflow-transition'

const mockTransitionWorkflowItem = vi.fn()
const mockUpdateRegistryRecord = vi.fn()
const mockSupabaseUpdate = vi.fn()

vi.mock('@/features/health/workflow/health-workflow.service', () => ({
	transitionWorkflowItem: (...args: unknown[]) =>
		mockTransitionWorkflowItem(...args),
}))

vi.mock('@/features/connectors/services/connector-store.service', () => ({
	updateRegistryRecord: (...args: unknown[]) =>
		mockUpdateRegistryRecord(...args),
}))

vi.mock('@/lib/supabase', () => ({
	supabase: {
		from: () => ({
			update: () => ({
				eq: () => ({
					eq: () => mockSupabaseUpdate(),
				}),
			}),
		}),
	},
}))

describe('safeTransitionWorkflowItem', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockSupabaseUpdate.mockResolvedValue({ error: null })
		mockUpdateRegistryRecord.mockResolvedValue(undefined)
	})

	it('returns true when transition succeeds', async () => {
		mockTransitionWorkflowItem.mockResolvedValue(undefined)

		const ok = await safeTransitionWorkflowItem({
			reportId: 'report-1',
			toState: 'FAILED',
			context: {
				userId: 'user-1',
				reportId: 'report-1',
				failureReason: 'Parse produced no metrics',
				failedStage: 'PARSING',
			},
		})

		expect(ok).toBe(true)
		expect(mockUpdateRegistryRecord).not.toHaveBeenCalled()
	})

	it('persists failure to registry and report when transition fails', async () => {
		mockTransitionWorkflowItem.mockRejectedValue(
			new Error('Invalid workflow transition: PARSING -> PENDING_REVIEW'),
		)

		const ok = await safeTransitionWorkflowItem({
			registryId: 'registry-1',
			reportId: 'report-1',
			toState: 'FAILED',
			context: {
				userId: 'user-1',
				reportId: 'report-1',
				failureReason:
					'OCR completed but no laboratory metrics were extracted from this report.',
				failedStage: 'PARSING',
			},
		})

		expect(ok).toBe(false)
		expect(mockUpdateRegistryRecord).toHaveBeenCalledWith('registry-1', {
			importStatus: 'failed',
			registryStatus: 'failed',
			errorMessage:
				'OCR completed but no laboratory metrics were extracted from this report.',
		})
		expect(mockSupabaseUpdate).toHaveBeenCalled()
	})
})
