import { invalidateHealthKnowledgeCache } from '@/features/health-knowledge/services/health-knowledge-cache'
import { persistHealthKnowledgeGraph } from '@/features/health-knowledge/services/health-knowledge-persist.service'
import { reportNeedsAiExtractionBackfill } from '@/features/health/services/health-partial-extraction.service'
import { reprocessHealthReportWithAi } from '@/features/health/services/health-processing.service'
import { isReportDisplayReady } from '@/features/health/services/report-readiness.service'
import { fetchUploadedHealthReports } from '@/features/health/services/health-upload.service'
import type { UploadedHealthReport } from '@/features/health/types'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'

const backfillInFlight = new Set<string>()

export function listReportsNeedingAiExtractionBackfill(
	reports: UploadedHealthReport[],
): UploadedHealthReport[] {
	return reports.filter(reportNeedsAiExtractionBackfill)
}

/** Re-run AI extraction on completed full-body reports with suspiciously low metric counts. */
export async function backfillAiExtractionForIncompleteReports(
	userId: string,
	reports?: UploadedHealthReport[],
): Promise<{ processed: number; failed: number; skipped: number }> {
	if (backfillInFlight.has(userId)) {
		return { processed: 0, failed: 0, skipped: 0 }
	}

	backfillInFlight.add(userId)

	try {
		const allReports = reports ?? (await fetchUploadedHealthReports())
		const eligible = listReportsNeedingAiExtractionBackfill(
			allReports.filter((report) => report.user_id === userId),
		)

		let processed = 0
		let failed = 0

		for (const report of eligible) {
			try {
				const result = await reprocessHealthReportWithAi(report.id)

				if (isReportDisplayReady(result)) {
					processed += 1
				} else {
					failed += 1
				}
			} catch {
				failed += 1
			}
		}

		if (processed > 0) {
			invalidateHealthKnowledgeCache(userId)
			await persistHealthKnowledgeGraph(userId, null)
			invalidateAfterHealthImport(userId)
		}

		return {
			processed,
			failed,
			skipped: allReports.length - eligible.length,
		}
	} finally {
		backfillInFlight.delete(userId)
	}
}
