import { C } from '@/constants/colors'
import {
	SourceCardFromCitation,
	SourceCardFromEvidence,
} from '@/features/ask/components/SourceCard'
import type { AskConversationTurn } from '@/features/ask/types'

interface SourceCardsPanelProps {
	turn: AskConversationTurn
}

export function SourceCardsPanel({ turn }: SourceCardsPanelProps) {
	const trust = turn.trust
	const confidenceLevel = trust?.confidence.level ?? turn.confidenceLevel
	const dataAvailable = turn.dataAvailable

	if (trust && trust.evidenceItems.length > 0) {
		return (
			<div style={{ marginTop: 16 }}>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
						color: C.textMuted,
						marginBottom: 10,
					}}
				>
					Sources
				</div>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
						gap: 10,
					}}
				>
					{trust.evidenceItems.map((item) => (
						<SourceCardFromEvidence
							key={item.id}
							item={item}
							confidenceLevel={confidenceLevel}
							dataAvailable={dataAvailable}
							memberName={turn.memberName}
						/>
					))}
				</div>
			</div>
		)
	}

	if (turn.citations.length > 0) {
		return (
			<div style={{ marginTop: 16 }}>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
						color: C.textMuted,
						marginBottom: 10,
					}}
				>
					Sources
				</div>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
						gap: 10,
					}}
				>
					{turn.citations.map((citation) => (
						<SourceCardFromCitation
							key={`${citation.reportId}-${citation.metricName ?? 'report'}`}
							citation={citation}
							confidenceLevel={confidenceLevel}
							dataAvailable={dataAvailable}
						/>
					))}
				</div>
			</div>
		)
	}

	if (turn.relatedReports.length > 0) {
		return (
			<div style={{ marginTop: 16 }}>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
						color: C.textMuted,
						marginBottom: 10,
					}}
				>
					Sources
				</div>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
						gap: 10,
					}}
				>
					{turn.relatedReports.map((report) => (
						<SourceCardFromCitation
							key={report.id}
							citation={{
								reportId: report.id,
								reportTitle: report.title,
								hospital: '',
								date: report.date,
								source: 'health',
							}}
							confidenceLevel={confidenceLevel}
							dataAvailable={dataAvailable}
						/>
					))}
				</div>
			</div>
		)
	}

	return null
}
