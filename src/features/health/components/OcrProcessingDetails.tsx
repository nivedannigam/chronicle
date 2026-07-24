import { C } from '@/constants/colors'
import { getHealthReportStatusLabel } from '@/features/health/services/health-processing.service'
import type { UploadedHealthReport } from '@/features/health/types'

function formatProcessingTime(ms: number | null): string {
	if (ms == null) {
		return '—'
	}

	if (ms < 1000) {
		return `${ms}ms`
	}

	return `${(ms / 1000).toFixed(1)}s`
}

function formatConfidence(confidence: number | null): string {
	if (confidence == null) {
		return '—'
	}

	return `${Math.round(confidence * 100)}%`
}

function formatProvider(provider: string | null): string {
	if (!provider) {
		return '—'
	}

	switch (provider) {
		case 'google-document-ai':
			return 'Google Document AI'
		case 'azure-document-intelligence':
			return 'Azure Document Intelligence'
		default:
			return provider
	}
}

interface OcrProcessingDetailsProps {
	report: UploadedHealthReport
}

export function OcrProcessingDetails({ report }: OcrProcessingDetailsProps) {
	const pageCount =
		typeof report.ocr_metadata?.pageCount === 'number'
			? report.ocr_metadata.pageCount
			: report.ocr_page_count
	const tableCount =
		typeof report.ocr_metadata?.tableCount === 'number'
			? report.ocr_metadata.tableCount
			: null

	const items = [
		{ label: 'OCR Status', value: getHealthReportStatusLabel(report.status) },
		{ label: 'OCR Provider', value: formatProvider(report.ocr_provider) },
		{ label: 'Confidence', value: formatConfidence(report.ocr_confidence) },
		{
			label: 'Processing Time',
			value: formatProcessingTime(report.ocr_processing_time_ms),
		},
		{ label: 'Pages', value: pageCount != null ? String(pageCount) : '—' },
	]

	if (tableCount != null) {
		items.push({ label: 'Tables', value: String(tableCount) })
	}

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: '1fr 1fr',
				gap: 8,
				marginTop: 8,
			}}
		>
			{items.map((item) => (
				<div
					key={item.label}
					style={{
						background: C.card2,
						border: `1px solid ${C.border}`,
						borderRadius: 10,
						padding: '8px 10px',
					}}
				>
					<div
						style={{
							fontSize: 10,
							fontWeight: 600,
							color: C.textMuted,
							marginBottom: 4,
							textTransform: 'uppercase',
							letterSpacing: '0.06em',
						}}
					>
						{item.label}
					</div>
					<div style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>
						{item.value}
					</div>
				</div>
			))}
		</div>
	)
}
