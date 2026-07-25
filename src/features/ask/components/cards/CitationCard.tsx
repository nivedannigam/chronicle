import { Link } from 'react-router-dom'
import { C } from '@/constants/colors'
import { healthReportPath } from '@/constants/routes'
import type { EvidenceCitation } from '@/features/ask/types'

interface CitationCardProps {
	citation: EvidenceCitation
}

export function CitationCard({ citation }: CitationCardProps) {
	const content = (
		<>
			<div style={{ fontWeight: 600, color: C.text }}>
				{citation.reportTitle}
			</div>
			<div>
				{citation.hospital ? `${citation.hospital} · ` : ''}
				{citation.date}
				{citation.metricName ? ` · ${citation.metricName}` : ''}
				{citation.timelineRef ? ` · ${citation.timelineRef}` : ''}
			</div>
		</>
	)

	const style = {
		display: 'block',
		fontSize: 12,
		color: C.textSec,
		background: C.card2,
		border: `1px solid ${C.border}`,
		borderRadius: 10,
		padding: '8px 10px',
		lineHeight: 1.45,
		textDecoration: 'none',
	} as const

	if (citation.source === 'health' && citation.reportId) {
		return (
			<Link to={healthReportPath(citation.reportId)} style={style}>
				{content}
			</Link>
		)
	}

	return <div style={style}>{content}</div>
}
