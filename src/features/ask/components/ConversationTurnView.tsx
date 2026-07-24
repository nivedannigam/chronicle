import { C } from '@/constants/colors'
import { AnswerCardRenderer } from '@/features/ask/components/AnswerCardRenderer'
import type { AskConversationTurn } from '@/features/ask/types'

interface ConversationTurnViewProps {
	turn: AskConversationTurn
	compact?: boolean
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

export function ConversationTurnView({
	turn,
	compact = false,
}: ConversationTurnViewProps) {
	const confidencePercent = Math.round(turn.confidence * 100)
	const confidenceLabel = confidenceColor(turn.confidence)

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

			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					lineHeight: 1.6,
					marginBottom: 16,
				}}
			>
				{turn.answer}
			</div>

			<AnswerCardRenderer cards={turn.cards} />

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
								Related Reports
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
						color: confidenceLabel,
					}}
				>
					{confidencePercent}% confidence
				</span>
				<span style={{ fontSize: 11, color: C.textMuted }}>
					{turn.displayTimestamp}
				</span>
			</div>
		</div>
	)
}
