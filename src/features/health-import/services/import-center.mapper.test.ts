import { describe, expect, it } from 'vitest'
import {
	buildImportAttentionSummary,
	buildImportCenterViewModel,
	mapSetupRowToHelpItem,
	mapSetupRowToOrganizingItem,
} from '@/features/health-import/services/import-center.mapper'
import type { SetupReportRowModel } from '@/features/health-import/types/setup-report-list.types'

describe('import-center.mapper', () => {
	it('maps processing rows to calm organizing copy', () => {
		const row = {
			key: 'r1',
			title: 'Blood Test Report',
			subtitle: '2026-03-01',
			status: 'processing',
		} as SetupReportRowModel

		expect(mapSetupRowToOrganizingItem(row).statusLine).toBe('Analyzing…')
	})

	it('maps failed rows to human help copy', () => {
		const row = {
			key: 'r2',
			title: 'ECG Report',
			status: 'failed',
			registryId: 'reg-1',
			reportId: 'rep-1',
		} as SetupReportRowModel

		expect(mapSetupRowToHelpItem(row)?.question).toBe(
			"We couldn't understand this document yet.",
		)
	})

	it('prioritizes attention summary over new visits', () => {
		const view = buildImportCenterViewModel({
			visits: [
				{
					id: 'v1',
					title: 'Annual Health Checkup',
					date: new Date().toISOString(),
					displayMonthYear: 'March 2026',
					reportCount: 2,
					status: 'ready',
					statusLabel: 'Ready',
				} as never,
			],
			setupRows: [
				{
					key: 'failed',
					title: 'Mystery PDF',
					status: 'failed',
					registryId: 'reg-1',
					reportId: null,
				} as SetupReportRowModel,
			],
			reviewDocuments: [],
			memberOptions: [],
		})

		expect(buildImportAttentionSummary({ view }).kind).toBe('needs_attention')
	})
})
