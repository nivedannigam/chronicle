import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	ArrowLeft,
	CheckCircle2,
	AlertTriangle,
	XCircle,
	Loader2,
	RefreshCw,
} from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { useHealthValidation } from '@/features/health-validation/hooks/useHealthValidation'
import type { ValidationStageStatus } from '@/features/health-validation/types/health-validation.types'

export function HealthValidationPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const validation = useHealthValidation(user?.id)

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.health)}
				style={backButtonStyle}
			>
				<ArrowLeft size={18} />
				Back to Home
			</button>

			<div
				style={{
					fontSize: 34,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				Health Import Validation
			</div>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 20,
					lineHeight: 1.5,
				}}
			>
				Verify the complete pipeline from Google Drive discovery through
				dashboard rendering.
			</div>

			<button
				type="button"
				onClick={() => void validation.runValidation()}
				disabled={validation.isRunning}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 8,
					background: C.accent,
					border: 'none',
					borderRadius: 100,
					padding: '12px 18px',
					fontSize: 13,
					fontWeight: 700,
					color: C.white,
					cursor: validation.isRunning ? 'not-allowed' : 'pointer',
					fontFamily: 'inherit',
					marginBottom: 20,
				}}
			>
				{validation.isRunning ? (
					<Loader2 size={16} className="spin" />
				) : (
					<RefreshCw size={16} />
				)}
				{validation.isRunning ? 'Running Validation…' : 'Run Validation'}
			</button>

			{validation.error ? (
				<div style={errorBoxStyle}>{validation.error}</div>
			) : null}

			{validation.report ? (
				<>
					<OverallStatusBanner status={validation.report.overallStatus} />

					<SectionTitle title="Pipeline Stages" />
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 8,
							marginBottom: 24,
						}}
					>
						{validation.report.stages.map((stage) => (
							<StageRow
								key={stage.id}
								label={stage.label}
								status={stage.status}
								message={stage.message}
								count={stage.count}
							/>
						))}
					</div>

					<SectionTitle title="Statistics" />
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(2, 1fr)',
							gap: 10,
							marginBottom: 24,
						}}
					>
						<StatTile
							label="Google Files Found"
							value={validation.report.stats.googleFilesFound}
						/>
						<StatTile
							label="Medical Reports"
							value={validation.report.stats.medicalReports}
						/>
						<StatTile
							label="Imported"
							value={validation.report.stats.imported}
						/>
						<StatTile
							label="OCR Completed"
							value={validation.report.stats.ocrCompleted}
						/>
						<StatTile
							label="Metrics Extracted"
							value={validation.report.stats.metricsExtracted}
						/>
						<StatTile
							label="Timeline Entries"
							value={validation.report.stats.timelineEntries}
						/>
						<StatTile
							label="Knowledge Graph Nodes"
							value={validation.report.stats.knowledgeGraphNodes}
						/>
					</div>

					<SectionTitle title="Data Integrity" />
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 8,
							marginBottom: 24,
						}}
					>
						{validation.report.integrityChecks.map((check) => (
							<div
								key={check.id}
								style={{
									display: 'flex',
									alignItems: 'flex-start',
									gap: 10,
									background: C.card,
									border: `1px solid ${C.border}`,
									borderRadius: 14,
									padding: '12px 14px',
								}}
							>
								<StatusIcon status={check.passed ? 'success' : 'failed'} />
								<div>
									<div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
										{check.label}
									</div>
									<div
										style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}
									>
										{check.detail}
									</div>
								</div>
							</div>
						))}
					</div>

					{validation.report.extractionQuality.length > 0 ? (
						<>
							<SectionTitle title="Extraction Quality" />
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: 10,
									marginBottom: 24,
								}}
							>
								{validation.report.extractionQuality.map((item) => (
									<div
										key={item.reportId}
										style={{
											background: C.card,
											border: `1px solid ${C.border}`,
											borderRadius: 14,
											padding: '12px 14px',
										}}
									>
										<div
											style={{
												fontSize: 14,
												fontWeight: 700,
												color: C.text,
												marginBottom: 8,
											}}
										>
											{item.fileName}
										</div>
										<div
											style={{
												fontSize: 12,
												color: C.textSec,
												lineHeight: 1.6,
											}}
										>
											<div>
												OCR Confidence:{' '}
												{item.ocrConfidence != null
													? `${Math.round(item.ocrConfidence * 100)}%`
													: '—'}
											</div>
											<div>Metrics: {item.metricCount}</div>
											<div>
												Patient Match:{' '}
												{item.patientMatchConfidence != null
													? `${Math.round(item.patientMatchConfidence * 100)}%`
													: '—'}
											</div>
											{item.unknownMetrics.length > 0 ? (
												<div>Unknown: {item.unknownMetrics.join(', ')}</div>
											) : null}
											{item.errors.length > 0 ? (
												<div style={{ color: C.orange }}>
													Errors: {item.errors.join(', ')}
												</div>
											) : null}
										</div>
										<button
											type="button"
											onClick={() => void validation.rerunOcr(item.reportId)}
											style={{
												marginTop: 10,
												background: C.accentDim,
												border: '1px solid rgba(108,111,255,0.25)',
												borderRadius: 100,
												padding: '6px 12px',
												fontSize: 11,
												fontWeight: 700,
												color: C.accent,
												cursor: 'pointer',
												fontFamily: 'inherit',
											}}
										>
											Re-run OCR
										</button>
									</div>
								))}
							</div>
						</>
					) : null}

					{(validation.report.errors.length > 0 ||
						validation.report.warnings.length > 0) && (
						<>
							<SectionTitle title="Errors & Warnings" />
							{validation.report.errors.map((message) => (
								<div
									key={message}
									style={{ ...errorBoxStyle, marginBottom: 8 }}
								>
									{message}
								</div>
							))}
							{validation.report.warnings.map((message) => (
								<div
									key={message}
									style={{ ...warningBoxStyle, marginBottom: 8 }}
								>
									{message}
								</div>
							))}
						</>
					)}
				</>
			) : null}
		</div>
	)
}

function OverallStatusBanner({ status }: { status: ValidationStageStatus }) {
	const config = {
		success: {
			label: 'All checks passed',
			color: C.greenAlt,
			bg: 'rgba(52,199,89,0.1)',
		},
		warning: {
			label: 'Validation passed with warnings',
			color: C.orange,
			bg: 'rgba(255,149,0,0.1)',
		},
		failed: {
			label: 'Validation failed',
			color: C.red,
			bg: 'rgba(255,69,58,0.1)',
		},
		pending: {
			label: 'Validation incomplete',
			color: C.textMuted,
			bg: 'rgba(255,255,255,0.04)',
		},
		skipped: {
			label: 'Validation skipped',
			color: C.textMuted,
			bg: 'rgba(255,255,255,0.04)',
		},
	}[status]

	return (
		<div
			style={{
				background: config.bg,
				border: `1px solid ${config.color}33`,
				borderRadius: 14,
				padding: '14px 16px',
				marginBottom: 20,
				fontSize: 14,
				fontWeight: 700,
				color: config.color,
			}}
		>
			{config.label}
		</div>
	)
}

function StageRow({
	label,
	status,
	message,
	count,
}: {
	label: string
	status: ValidationStageStatus
	message: string
	count?: number
}) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 12,
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				padding: '12px 14px',
			}}
		>
			<StatusIcon status={status} />
			<div style={{ flex: 1, minWidth: 0 }}>
				<div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
					{label}
				</div>
				<div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
					{message}
				</div>
			</div>
			{count != null ? (
				<div style={{ fontSize: 16, fontWeight: 800, color: C.textSec }}>
					{count}
				</div>
			) : null}
		</div>
	)
}

function StatusIcon({ status }: { status: ValidationStageStatus }) {
	switch (status) {
		case 'success':
			return <CheckCircle2 size={20} color={C.greenAlt} />
		case 'warning':
			return <AlertTriangle size={20} color={C.orange} />
		case 'failed':
			return <XCircle size={20} color={C.red} />
		default:
			return <Loader2 size={20} color={C.textMuted} />
	}
}

function StatTile({ label, value }: { label: string; value: number }) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 12,
				padding: '10px 12px',
			}}
		>
			<div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>
				{label}
			</div>
			<div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
				{value}
			</div>
		</div>
	)
}

function SectionTitle({ title }: { title: string }) {
	return (
		<div
			style={{
				fontSize: 11,
				fontWeight: 700,
				textTransform: 'uppercase',
				letterSpacing: '0.08em',
				color: C.textMuted,
				marginBottom: 12,
			}}
		>
			{title}
		</div>
	)
}

const backButtonStyle: CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: 6,
	background: 'none',
	border: 'none',
	padding: 0,
	marginBottom: 16,
	cursor: 'pointer',
	color: C.textSec,
	fontFamily: 'inherit',
	fontSize: 14,
}

const errorBoxStyle: CSSProperties = {
	background: 'rgba(255,69,58,0.08)',
	border: '1px solid rgba(255,69,58,0.2)',
	borderRadius: 12,
	padding: '12px 14px',
	fontSize: 13,
	color: C.red,
}

const warningBoxStyle: CSSProperties = {
	background: 'rgba(255,149,0,0.08)',
	border: '1px solid rgba(255,149,0,0.2)',
	borderRadius: 12,
	padding: '12px 14px',
	fontSize: 13,
	color: C.orange,
}
