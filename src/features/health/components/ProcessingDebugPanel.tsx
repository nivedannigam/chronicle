import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import type { ProcessingDebugInfo } from '@/features/document-intelligence/domain/health-report.domain'

interface ProcessingDebugPanelProps {
	debug: ProcessingDebugInfo
	rawOcrText?: string | null
}

export function ProcessingDebugPanel({
	debug,
	rawOcrText,
}: ProcessingDebugPanelProps) {
	const navigate = useNavigate()

	if (!import.meta.env.DEV) {
		return null
	}

	return (
		<div style={{ marginTop: 24 }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 12,
					marginBottom: 12,
				}}
			>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.09em',
						textTransform: 'uppercase',
						color: C.orange,
					}}
				>
					Processing Debug (Dev Only)
				</div>
				<button
					type="button"
					onClick={() => navigate(ROUTES.healthKnowledgeDebug)}
					style={{
						background: C.card2,
						border: `1px solid ${C.border}`,
						borderRadius: 100,
						padding: '6px 12px',
						fontSize: 11,
						color: C.textSec,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					Knowledge Graph
				</button>
			</div>
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.orange}44`,
					borderRadius: 18,
					padding: '16px',
					fontSize: 12,
					color: C.textSec,
					lineHeight: 1.6,
				}}
			>
				<div style={{ marginBottom: 12 }}>
					<strong style={{ color: C.text }}>OCR</strong>
					<div>Provider: {debug.ocrProvider}</div>
					<div>Confidence: {Math.round(debug.ocrConfidence * 100)}%</div>
					<div>Processing Time: {debug.ocrProcessingTimeMs}ms</div>
					<div>
						Pages: {debug.pageCount} · Tables: {debug.tableCount}
					</div>
				</div>

				<div style={{ marginBottom: 12 }}>
					<strong style={{ color: C.text }}>Parsed Fields</strong>
					{Object.entries(debug.parsedFields).map(([key, value]) => (
						<div key={key}>
							{key}: {value ?? '—'}
						</div>
					))}
				</div>

				<div style={{ marginBottom: 12 }}>
					<strong style={{ color: C.text }}>Normalization</strong>
					{debug.normalizationMap.map((entry) => (
						<div key={`${entry.raw}-${entry.canonical}`}>
							{entry.raw} → {entry.canonical}
						</div>
					))}
				</div>

				<div style={{ marginBottom: 12 }}>
					<strong style={{ color: C.text }}>Extracted Metrics</strong>
					<div>{debug.extractedMetricCount} metrics</div>
					{debug.warnings.map((warning) => (
						<div key={warning} style={{ color: C.orange }}>
							{warning}
						</div>
					))}
				</div>

				{rawOcrText ? (
					<div>
						<strong style={{ color: C.text }}>Raw OCR Text</strong>
						<pre
							style={{
								marginTop: 8,
								padding: 12,
								background: C.card2,
								borderRadius: 12,
								overflowX: 'auto',
								whiteSpace: 'pre-wrap',
								fontSize: 11,
								color: C.textMuted,
							}}
						>
							{rawOcrText}
						</pre>
					</div>
				) : null}
			</div>
		</div>
	)
}
