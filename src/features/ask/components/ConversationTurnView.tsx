import { Link } from 'react-router-dom'
import { C } from '@/constants/colors'
import { healthReportPath } from '@/constants/routes'
import { AnswerCardRenderer } from '@/features/ask/components/AnswerCardRenderer'
import type {
	AskConversationTurn,
	EvidenceCitation,
} from '@/features/ask/types'

interface ConversationTurnViewProps {
	turn: AskConversationTurn
	compact?: boolean
	onFollowUpSelect?: (question: string) => void
}

function confidenceColor(confidence: number): string {
	if (confidence >= 0.85) {
		return C.greenAlt
	}

	if (confidence >= 0.7) {
		return C.orange
	}

	return C.textMuted
}

function confidenceLabel(confidence: number, dataAvailable: boolean): string {
	if (!dataAvailable) {
		return 'Limited data'
	}

	const percent = Math.round(confidence * 100)

	if (confidence >= 0.85) {
		return `${percent}% confidence`
	}

	if (confidence >= 0.7) {
		return `${percent}% confidence`
	}

	return `${percent}% confidence`
}

function CitationCard({ citation }: { citation: EvidenceCitation }) {
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

export function ConversationTurnView({
	turn,
	compact = false,
	onFollowUpSelect,
}: ConversationTurnViewProps) {
	const confidenceTextColor = confidenceColor(turn.confidence)

	return (
		<div style={{ paddingTop: compact ? 14 : 0 }}>
			{!compact ? (
				<div
					style={{
						fontSize: 15,
						fontWeight: 700,
						color: C.text,
						marginBottom: 10,
						lineHeight: 1.4,
					}}
				>
					{turn.question}
				</div>
			) : null}

			{turn.memberName ? (
				<div
					style={{
						fontSize: 12,
						color: C.textMuted,
						marginBottom: 10,
					}}
				>
					Answering for {turn.memberName}
				</div>
			) : null}

			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					lineHeight: 1.6,
					marginBottom: 16,
					whiteSpace: 'pre-wrap',
				}}
			>
				{turn.answer}
			</div>

			<AnswerCardRenderer cards={turn.cards} />

			{turn.evidence.length > 0 ? (
				<div
					style={{
						marginTop: 16,
						paddingTop: 14,
						borderTop: `1px solid ${C.border}`,
					}}
				>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							letterSpacing: '0.08em',
							textTransform: 'uppercase',
							color: C.textMuted,
							marginBottom: 8,
						}}
					>
						Evidence
					</div>
					<ul
						style={{
							margin: 0,
							paddingLeft: 18,
							display: 'flex',
							flexDirection: 'column',
							gap: 6,
						}}
					>
						{turn.evidence.map((line) => (
							<li
								key={line}
								style={{
									fontSize: 12,
									color: C.textSec,
									lineHeight: 1.5,
								}}
							>
								{line}
							</li>
						))}
					</ul>
				</div>
			) : null}

			{turn.citations.length > 0 ? (
				<div
					style={{
						marginTop: 16,
						paddingTop: 14,
						borderTop: `1px solid ${C.border}`,
					}}
				>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							letterSpacing: '0.08em',
							textTransform: 'uppercase',
							color: C.textMuted,
							marginBottom: 8,
						}}
					>
						Citations
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{turn.citations.map((citation) => (
							<CitationCard
								key={`${citation.reportId}-${citation.metricName ?? 'report'}`}
								citation={citation}
							/>
						))}
					</div>
				</div>
			) : null}

			{(turn.relatedReports.length > 0 || turn.relatedMetrics.length > 0) && (
				<div
					style={{
						marginTop: 16,
						paddingTop: 14,
						borderTop: `1px solid ${C.border}`,
					}}
				>
					{turn.relatedReports.length > 0 ? (
						<div style={{ marginBottom: 12 }}>
							<div
								style={{
									fontSize: 11,
									fontWeight: 600,
									letterSpacing: '0.08em',
									textTransform: 'uppercase',
									color: C.textMuted,
									marginBottom: 8,
								}}
							>
								Referenced Reports
							</div>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
								{turn.relatedReports.map((report) => (
									<span
										key={report.id}
										style={{
											fontSize: 12,
											color: C.accentBlue,
											background: C.accentBlueDim,
											borderRadius: 100,
											padding: '4px 10px',
										}}
									>
										{report.title}
									</span>
								))}
							</div>
						</div>
					) : null}

					{turn.relatedMetrics.length > 0 ? (
						<div style={{ marginBottom: 12 }}>
							<div
								style={{
									fontSize: 11,
									fontWeight: 600,
									letterSpacing: '0.08em',
									textTransform: 'uppercase',
									color: C.textMuted,
									marginBottom: 8,
								}}
							>
								Related Metrics
							</div>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
								{turn.relatedMetrics.map((metric) => (
									<span
										key={`${metric.name}-${metric.value}`}
										style={{
											fontSize: 12,
											color: C.textSec,
											background: C.card2,
											border: `1px solid ${C.border}`,
											borderRadius: 100,
											padding: '4px 10px',
										}}
									>
										{metric.name}: {metric.value}
									</span>
								))}
							</div>
						</div>
					) : null}
				</div>
			)}

			{turn.followUpQuestions.length > 0 && onFollowUpSelect ? (
				<div
					style={{
						marginTop: 16,
						paddingTop: 14,
						borderTop: `1px solid ${C.border}`,
					}}
				>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							letterSpacing: '0.08em',
							textTransform: 'uppercase',
							color: C.textMuted,
							marginBottom: 8,
						}}
					>
						Follow-up questions
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
						{turn.followUpQuestions.map((question) => (
							<button
								key={question}
								type="button"
								onClick={() => onFollowUpSelect(question)}
								style={{
									textAlign: 'left',
									fontSize: 13,
									color: C.textSec,
									background: C.card2,
									border: `1px solid ${C.border}`,
									borderRadius: 12,
									padding: '10px 12px',
									cursor: 'pointer',
									fontFamily: 'inherit',
								}}
							>
								{question}
							</button>
						))}
					</div>
				</div>
			) : null}

			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginTop: 14,
					paddingTop: 12,
					borderTop: compact ? 'none' : `1px solid ${C.border}`,
				}}
			>
				<span
					style={{
						fontSize: 11,
						fontWeight: 700,
						color: confidenceTextColor,
					}}
				>
					{confidenceLabel(turn.confidence, turn.dataAvailable)}
				</span>
				<span style={{ fontSize: 11, color: C.textMuted }}>
					{turn.displayTimestamp}
				</span>
			</div>
		</div>
	)
}
