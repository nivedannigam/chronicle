import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { C } from '@/constants/colors'
import {
	healthMetricPath,
	healthOcrPreviewPath,
	healthReportPath,
} from '@/constants/routes'
import type {
	TrustEvidenceItem,
	TrustResponse,
} from '@/features/ask/trust/trust.types'

interface EvidencePanelProps {
	trust: TrustResponse
	defaultExpanded?: boolean
}

function claimKindLabel(kind: TrustEvidenceItem['claimKind']): string {
	switch (kind) {
		case 'known_fact':
			return 'Known from records'
		case 'inference':
			return 'Supporting context'
		default:
			return 'Unavailable'
	}
}

function claimKindColor(kind: TrustEvidenceItem['claimKind']): string {
	switch (kind) {
		case 'known_fact':
			return C.greenAlt
		case 'inference':
			return C.orange
		default:
			return C.textMuted
	}
}

export function EvidencePanel({
	trust,
	defaultExpanded = false,
}: EvidencePanelProps) {
	const [expanded, setExpanded] = useState(defaultExpanded)

	if (trust.evidenceItems.length === 0 && trust.evidence.length === 0) {
		return null
	}

	return (
		<div
			style={{
				marginTop: 16,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				overflow: 'hidden',
				background: C.card2,
			}}
		>
			<button
				type="button"
				onClick={() => setExpanded((value) => !value)}
				style={{
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '12px 14px',
					background: 'transparent',
					border: 'none',
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				<span
					style={{
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
						color: C.textMuted,
					}}
				>
					Evidence ({trust.evidenceItems.length})
				</span>
				{expanded ? (
					<ChevronDown size={16} color={C.textMuted} />
				) : (
					<ChevronRight size={16} color={C.textMuted} />
				)}
			</button>

			{expanded ? (
				<div
					style={{
						padding: '0 14px 14px',
						display: 'flex',
						flexDirection: 'column',
						gap: 10,
					}}
				>
					{trust.evidenceItems.map((item) => (
						<EvidenceItemCard key={item.id} item={item} />
					))}

					{trust.evidence.length > 0 ? (
						<ul
							style={{
								margin: '8px 0 0',
								paddingLeft: 18,
								display: 'flex',
								flexDirection: 'column',
								gap: 4,
							}}
						>
							{trust.evidence.map((line) => (
								<li
									key={line}
									style={{ fontSize: 12, color: C.textSec, lineHeight: 1.5 }}
								>
									{line}
								</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}
		</div>
	)
}

function EvidenceItemCard({ item }: { item: TrustEvidenceItem }) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 12,
				padding: '10px 12px',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 6,
				}}
			>
				<Link
					to={healthReportPath(item.reportId)}
					style={{
						fontSize: 13,
						fontWeight: 600,
						color: C.accentBlue,
						textDecoration: 'none',
					}}
				>
					{item.reportTitle}
				</Link>
				<span
					style={{
						fontSize: 10,
						fontWeight: 600,
						color: claimKindColor(item.claimKind),
					}}
				>
					{claimKindLabel(item.claimKind)}
				</span>
			</div>

			<div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
				{item.hospital ? `${item.hospital} · ` : ''}
				{item.reportDate}
				{item.section ? ` · ${item.section}` : ''}
			</div>

			{item.metricName ? (
				<div style={{ fontSize: 13, color: C.textSec, marginBottom: 6 }}>
					<Link
						to={healthMetricPath(
							item.metricId ??
								item.metricName.toLowerCase().replace(/\s+/g, '-'),
						)}
						style={{ color: C.text, textDecoration: 'none', fontWeight: 600 }}
					>
						{item.metricName}
					</Link>
					{item.metricValue ? `: ${item.metricValue}` : ''}
				</div>
			) : null}

			{item.ocrExcerpt ? (
				<div
					style={{
						fontSize: 11,
						color: C.textMuted,
						fontStyle: 'italic',
						lineHeight: 1.45,
						marginBottom: 8,
						padding: '8px 10px',
						background: C.card2,
						borderRadius: 8,
					}}
				>
					"{item.ocrExcerpt}"
				</div>
			) : null}

			<div style={{ display: 'flex', gap: 12 }}>
				<Link
					to={healthReportPath(item.reportId)}
					style={{
						fontSize: 11,
						fontWeight: 600,
						color: C.teal,
						textDecoration: 'none',
						display: 'inline-flex',
						alignItems: 'center',
						gap: 4,
					}}
				>
					View report
					<ExternalLink size={12} />
				</Link>
				{item.ocrExcerpt ? (
					<Link
						to={healthOcrPreviewPath(item.reportId)}
						style={{
							fontSize: 11,
							fontWeight: 600,
							color: C.textMuted,
							textDecoration: 'none',
						}}
					>
						View original report
					</Link>
				) : null}
			</div>
		</div>
	)
}
