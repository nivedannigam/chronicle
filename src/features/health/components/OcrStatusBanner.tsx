import { C } from '@/constants/colors'
import type { OcrProviderStatusSnapshot } from '@chronicle/core-ocr'
import type { UploadedHealthReport } from '@/features/health/types'
import { needsOcrReprocess } from '@/features/health/services/health-parsed-report.service'

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

function statusColor(status: OcrProviderStatusSnapshot['configurationStatus']) {
	switch (status) {
		case 'ready':
			return C.greenAlt
		case 'development':
			return C.accentBlue
		default:
			return '#FFB020'
	}
}

export function OcrProviderStatusPanel({
	status,
	isLoading = false,
}: {
	status: OcrProviderStatusSnapshot | undefined
	isLoading?: boolean
}) {
	if (isLoading && !status) {
		return (
			<div
				style={{
					background: C.card2,
					border: `1px solid ${C.border}`,
					borderRadius: 14,
					padding: '12px 14px',
					marginBottom: 16,
					fontSize: 13,
					color: C.textSec,
				}}
			>
				Checking OCR provider status…
			</div>
		)
	}

	if (!status) {
		return null
	}

	const tone = statusColor(status.configurationStatus)

	return (
		<div
			style={{
				background: C.card2,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				padding: '14px 16px',
				marginBottom: 16,
			}}
		>
			<div
				style={{
					fontSize: 11,
					fontWeight: 700,
					color: C.textMuted,
					textTransform: 'uppercase',
					letterSpacing: '0.08em',
					marginBottom: 10,
				}}
			>
				OCR Provider
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: 10,
					marginBottom: status.latestProcessingError ? 12 : 0,
				}}
			>
				<StatusField label="Provider" value={status.providerLabel} />
				<StatusField
					label="Status"
					value={status.configurationStatusLabel}
					valueColor={tone}
				/>
			</div>

			{status.configurationStatus === 'not_configured' ? (
				<div
					style={{
						fontSize: 13,
						color: C.textSec,
						lineHeight: 1.55,
						background: 'rgba(255,176,32,0.08)',
						border: '1px solid rgba(255,176,32,0.25)',
						borderRadius: 12,
						padding: '10px 12px',
					}}
				>
					Deploy the <code style={{ fontSize: 12 }}>document-ocr</code> edge
					function and set Google Document AI secrets in Supabase, then retry
					import.
				</div>
			) : null}

			{status.latestProcessingError ? (
				<div style={{ marginTop: 12 }}>
					<div
						style={{
							fontSize: 11,
							fontWeight: 700,
							color: C.textMuted,
							textTransform: 'uppercase',
							letterSpacing: '0.08em',
							marginBottom: 6,
						}}
					>
						Latest processing error
					</div>
					<div
						style={{
							fontSize: 13,
							color: C.textSec,
							lineHeight: 1.55,
							background: 'rgba(255,69,58,0.08)',
							border: '1px solid rgba(255,69,58,0.18)',
							borderRadius: 12,
							padding: '10px 12px',
						}}
					>
						{status.latestProcessingError}
					</div>
				</div>
			) : null}
		</div>
	)
}

function StatusField({
	label,
	value,
	valueColor = C.text,
}: {
	label: string
	value: string
	valueColor?: string
}) {
	return (
		<div>
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
				{label}
			</div>
			<div style={{ fontSize: 13, fontWeight: 600, color: valueColor }}>
				{value}
			</div>
		</div>
	)
}

/** @deprecated Use OcrProviderStatusPanel with useOcrProviderStatus instead. */
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
