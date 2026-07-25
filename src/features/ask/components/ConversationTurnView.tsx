import { C } from '@/constants/colors'
import { CitationCard } from '@/features/ask/components/cards/CitationCard'
import { TypingIndicator } from '@/features/ask/components/TypingIndicator'
import { AnswerCardRenderer } from '@/features/ask/components/AnswerCardRenderer'
import { confidenceLevelLabel } from '@/features/intelligence/types/confidence.types'
import type { AskConversationTurn } from '@/features/ask/types'

interface ConversationTurnViewProps {
	turn: AskConversationTurn
	compact?: boolean
	isTyping?: boolean
	onFollowUpSelect?: (question: string) => void
}

function confidenceColor(
	level: AskConversationTurn['confidenceLevel'],
): string {
	switch (level) {
		case 'high':
			return C.greenAlt
		case 'medium':
			return C.orange
		default:
			return C.textMuted
	}
}

export function ConversationTurnView({
	turn,
	compact = false,
	isTyping = false,
	onFollowUpSelect,
}: ConversationTurnViewProps) {
	const confidenceTextColor = confidenceColor(turn.confidenceLevel)
	const showTyping = isTyping && !turn.answer.trim()

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

			{showTyping ? (
				<TypingIndicator />
			) : (
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
			)}

			{!showTyping ? <AnswerCardRenderer cards={turn.cards} /> : null}

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
					{confidenceLevelLabel(turn.confidenceLevel, turn.dataAvailable)}
				</span>
				<span style={{ fontSize: 11, color: C.textMuted }}>
					{turn.displayTimestamp}
				</span>
			</div>
		</div>
	)
}
