import { Link } from 'react-router-dom'
import { ExternalLink, FileText } from 'lucide-react'
import { C } from '@/constants/colors'
import { documentPath, healthReportPath } from '@/constants/routes'
import { confidenceLevelLabel } from '@/features/intelligence/types/confidence.types'
import type { TrustEvidenceItem } from '@/features/ask/trust/trust.types'
import type { EvidenceCitation } from '@/features/ask/types'

interface SourceCardProps {
	title: string
	date: string
	memberName?: string | null
	confidenceLabel?: string
	reportId?: string
	documentId?: string
	subtitle?: string
}

export function SourceCard({
	title,
	date,
	memberName,
	confidenceLabel,
	reportId,
	documentId,
	subtitle,
}: SourceCardProps) {
	const path = reportId
		? healthReportPath(reportId)
		: documentId
			? documentPath(documentId)
			: null

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				padding: '12px 14px',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					gap: 10,
				}}
			>
				<div
					style={{
						width: 34,
						height: 34,
						borderRadius: 10,
						background: `${C.teal}18`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
					}}
				>
					<FileText size={16} color={C.teal} />
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontSize: 14,
							fontWeight: 700,
							marginBottom: 4,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{title}
					</div>
					<div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>
						{date}
						{memberName ? ` · ${memberName}` : ''}
					</div>
					{subtitle ? (
						<div style={{ fontSize: 12, color: C.textSec }}>{subtitle}</div>
					) : null}
					{confidenceLabel ? (
						<div
							style={{
								fontSize: 11,
								fontWeight: 700,
								color: C.greenAlt,
								marginTop: 6,
							}}
						>
							{confidenceLabel}
						</div>
					) : null}
				</div>
			</div>

			{path ? (
				<Link
					to={path}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 4,
						marginTop: 10,
						fontSize: 12,
						fontWeight: 700,
						color: C.accentBlue,
						textDecoration: 'none',
					}}
				>
					Open source
					<ExternalLink size={13} />
				</Link>
			) : null}
		</div>
	)
}

export function SourceCardFromEvidence({
	item,
	confidenceLevel,
	dataAvailable,
	memberName,
}: {
	item: TrustEvidenceItem
	confidenceLevel?: 'high' | 'medium' | 'low'
	dataAvailable?: boolean
	memberName?: string | null
}) {
	return (
		<SourceCard
			title={item.reportTitle}
			date={item.reportDate}
			memberName={memberName}
			subtitle={
				item.metricName
					? `${item.metricName}${item.metricValue ? `: ${item.metricValue}` : ''}`
					: item.hospital || undefined
			}
			reportId={item.reportId}
			confidenceLabel={confidenceLevelLabel(
				confidenceLevel ?? 'medium',
				dataAvailable ?? true,
			)}
		/>
	)
}

export function SourceCardFromCitation({
	citation,
	confidenceLevel,
	dataAvailable,
}: {
	citation: EvidenceCitation
	confidenceLevel?: 'high' | 'medium' | 'low'
	dataAvailable?: boolean
}) {
	return (
		<SourceCard
			title={citation.reportTitle}
			date={citation.date}
			subtitle={citation.metricName ?? citation.hospital}
			reportId={citation.reportId}
			confidenceLabel={confidenceLevelLabel(
				confidenceLevel ?? 'medium',
				dataAvailable ?? true,
			)}
		/>
	)
}
