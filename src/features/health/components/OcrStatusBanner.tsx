import { C } from '@/constants/colors'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	hasLegacyApproximateOcr,
	needsOcrReprocess,
} from '@/features/health/services/health-parsed-report.service'

export function OcrReprocessBadge({
	report,
}: {
	report: UploadedHealthReport
}) {
	if (!needsOcrReprocess(report)) {
		return null
	}

	return (
		<span
			style={{
				fontSize: 10,
				fontWeight: 700,
				color: '#FFB020',
				background: 'rgba(255,176,32,0.15)',
				borderRadius: 100,
				padding: '3px 9px',
			}}
		>
			Reprocess needed
		</span>
	)
}

export function OcrConfigurationBanner() {
	return (
		<div
			style={{
				background: 'rgba(255,176,32,0.1)',
				border: '1px solid rgba(255,176,32,0.35)',
				borderRadius: 14,
				padding: '12px 14px',
				fontSize: 13,
				color: C.textSec,
				lineHeight: 1.5,
				marginBottom: 16,
			}}
		>
			<strong style={{ color: '#FFB020' }}>OCR not configured</strong> — deploy
			the <code style={{ fontSize: 12 }}>document-ocr</code> edge function and
			set Google Document AI secrets in Supabase. Then use{' '}
			<strong>Reprocess all</strong> on Health → Reports.
		</div>
	)
}

export function LegacyOcrDataBanner() {
	return (
		<div
			style={{
				background: 'rgba(255,176,32,0.1)',
				border: '1px solid rgba(255,176,32,0.35)',
				borderRadius: 14,
				padding: '12px 14px',
				fontSize: 13,
				color: C.textSec,
				lineHeight: 1.5,
				marginBottom: 16,
			}}
		>
			<strong style={{ color: '#FFB020' }}>Approximate data</strong> — some
			reports were processed before real OCR was enabled. Reprocess after
			deploying document-ocr for accurate metrics.
		</div>
	)
}

export function countReportsNeedingOcrReprocess(
	reports: UploadedHealthReport[],
): number {
	return reports.filter(
		(report) => report.status === 'completed' && needsOcrReprocess(report),
	).length
}

export function countLegacyApproximateOcrReports(
	reports: UploadedHealthReport[],
): number {
	return reports.filter(
		(report) =>
			report.status === 'completed' && hasLegacyApproximateOcr(report),
	).length
}
