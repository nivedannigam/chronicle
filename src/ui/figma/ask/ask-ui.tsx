import type { ReactNode } from 'react'
import { ChevronRight, History, MessageSquare, Sparkles } from 'lucide-react'
import type {
	AskHomeInsight,
	AskQuickAction,
} from '@/features/ask/services/ask-home.service'
import type { DynamicSuggestionChip } from '@/features/ask/services/dynamic-suggestions.service'
import type { AskSessionMeta } from '@/features/ask/services/ask-session.service'
import type { StructuredAskResponse } from '@/features/ask/types/structured-response.types'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

const CATEGORY_COLORS = {
	health: FC.green,
	documents: FC.blue,
	timeline: FC.indigo,
	general: FC.purple,
} as const

export function AskSectionLabel({ children }: { children: ReactNode }) {
	return (
		<span
			style={{
				color: 'rgba(255,255,255,0.28)',
				fontSize: 11,
				fontWeight: 600,
				letterSpacing: '0.09em',
				textTransform: 'uppercase',
			}}
		>
			{children}
		</span>
	)
}

export function AskGreetingCard({
	greeting,
	subGreeting,
}: {
	greeting: string
	subGreeting: string
}) {
	return (
		<div
			style={{
				background:
					'linear-gradient(160deg,rgba(99,102,241,0.14) 0%,rgba(59,130,246,0.08) 50%,rgba(139,92,246,0.1) 100%)',
				border: '1px solid rgba(99,102,241,0.22)',
				borderRadius: 26,
				padding: '24px 22px',
				boxShadow:
					'0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
				<div
					style={{
						width: 46,
						height: 46,
						borderRadius: 15,
						background: `linear-gradient(135deg,${FC.indigo},${FC.purple})`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
					}}
				>
					<Sparkles size={22} color="#fff" />
				</div>
				<div>
					<h2
						style={{
							color: FC.fg,
							fontSize: 20,
							fontWeight: 700,
							letterSpacing: -0.7,
							lineHeight: 1.2,
							margin: '0 0 4px',
						}}
					>
						{greeting}
					</h2>
					<p
						style={{
							color: FC.mid,
							fontSize: 13,
							lineHeight: 1.5,
							margin: 0,
						}}
					>
						{subGreeting}
					</p>
				</div>
			</div>
		</div>
	)
}

export function AskSuggestedQuestionRow({
	chip,
	onSelect,
}: {
	chip: DynamicSuggestionChip
	onSelect: (question: string) => void
}) {
	const color = CATEGORY_COLORS[chip.category]

	return (
		<button
			type="button"
			onClick={() => onSelect(chip.question)}
			style={{
				...figmaCardStyle,
				borderRadius: 16,
				padding: '13px 16px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				cursor: 'pointer',
				textAlign: 'left',
				fontFamily: 'inherit',
				width: '100%',
				borderLeft: `3px solid ${color}`,
			}}
		>
			<span style={{ color: 'rgba(255,255,255,0.78)', fontSize: 14 }}>
				{chip.label}
			</span>
			<ChevronRight size={14} color="rgba(255,255,255,0.2)" />
		</button>
	)
}

export function AskRecentSessionRow({
	session,
	onSelect,
}: {
	session: AskSessionMeta
	onSelect: (sessionId: string) => void
}) {
	return (
		<button
			type="button"
			onClick={() => onSelect(session.id)}
			style={{
				...figmaCardStyle,
				borderRadius: 16,
				padding: '12px 14px',
				display: 'flex',
				alignItems: 'center',
				gap: 12,
				cursor: 'pointer',
				fontFamily: 'inherit',
				width: '100%',
				textAlign: 'left',
			}}
		>
			<div
				style={{
					width: 36,
					height: 36,
					borderRadius: 12,
					background: `${FC.indigo}14`,
					border: `1px solid ${FC.indigo}22`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				<MessageSquare size={16} color={FC.indigo} />
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 14,
						fontWeight: 600,
						margin: '0 0 2px',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{session.title}
				</p>
				<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>
					{session.turnCount} turn{session.turnCount === 1 ? '' : 's'}
					{session.memberName ? ` · ${session.memberName}` : ''}
				</p>
			</div>
			<ChevronRight size={14} color={FC.dim} />
		</button>
	)
}

export function AskQuickActionCard({
	action,
	onSelect,
}: {
	action: AskQuickAction
	onSelect: (route: string) => void
}) {
	return (
		<button
			type="button"
			onClick={() => onSelect(action.route)}
			style={{
				background: `${action.color}10`,
				border: `1px solid ${action.color}22`,
				borderRadius: 18,
				padding: '14px 14px',
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
				flex: 1,
				minWidth: 0,
			}}
		>
			<p
				style={{
					color: action.color,
					fontSize: 13,
					fontWeight: 700,
					margin: '0 0 4px',
				}}
			>
				{action.label}
			</p>
			<p style={{ color: FC.mid, fontSize: 11.5, margin: 0, lineHeight: 1.4 }}>
				{action.description}
			</p>
		</button>
	)
}

export function AskInsightRow({ insight }: { insight: AskHomeInsight }) {
	const color =
		insight.domain === 'health'
			? FC.green
			: insight.domain === 'documents'
				? FC.blue
				: FC.purple

	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 16,
				padding: '12px 14px',
				borderLeft: `3px solid ${insight.severity === 'attention' ? FC.amber : color}`,
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 13.5,
					fontWeight: 600,
					margin: '0 0 4px',
				}}
			>
				{insight.title}
			</p>
			<p style={{ color: FC.mid, fontSize: 12.5, margin: 0, lineHeight: 1.45 }}>
				{insight.detail}
			</p>
		</div>
	)
}

export function AskHistoryButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label="Conversation history"
			style={{
				background: FC.surface,
				border: `1px solid ${FC.line}`,
				borderRadius: 12,
				width: 36,
				height: 36,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				cursor: 'pointer',
				fontFamily: 'inherit',
			}}
		>
			<History size={16} color={FC.mid} />
		</button>
	)
}

function confidenceColor(
	level: StructuredAskResponse['confidenceLevel'],
): string {
	switch (level) {
		case 'high':
			return FC.green
		case 'medium':
			return FC.amber
		default:
			return FC.dim
	}
}

export function AskStructuredResponseView({
	structured,
	memberName,
	children,
}: {
	structured: StructuredAskResponse
	memberName?: string | null
	children?: ReactNode
}) {
	return (
		<div>
			{memberName ? (
				<p
					style={{
						color: FC.dim,
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.04em',
						margin: '0 0 10px',
						textTransform: 'uppercase',
					}}
				>
					For {memberName}
				</p>
			) : null}

			<p
				style={{
					color: FC.fg,
					fontSize: 16,
					fontWeight: 600,
					lineHeight: 1.55,
					margin: '0 0 12px',
				}}
			>
				{structured.directAnswer}
			</p>

			{structured.explanation ? (
				<div style={{ marginBottom: 14 }}>
					<AskSectionLabel>Explanation</AskSectionLabel>
					<p
						style={{
							color: FC.mid,
							fontSize: 14,
							lineHeight: 1.65,
							margin: '8px 0 0',
						}}
					>
						{structured.explanation}
					</p>
				</div>
			) : null}

			{structured.recommendations.length > 0 ? (
				<div style={{ marginBottom: 14 }}>
					<AskSectionLabel>Recommendations</AskSectionLabel>
					<ul
						style={{
							margin: '8px 0 0',
							paddingLeft: 18,
							display: 'flex',
							flexDirection: 'column',
							gap: 6,
						}}
					>
						{structured.recommendations.map((item) => (
							<li
								key={item}
								style={{ color: FC.mid, fontSize: 13.5, lineHeight: 1.5 }}
							>
								{item}
							</li>
						))}
					</ul>
				</div>
			) : null}

			{structured.uncertaintyNote ? (
				<div
					style={{
						background: `${FC.amber}10`,
						border: `1px solid ${FC.amber}22`,
						borderRadius: 14,
						padding: '10px 12px',
						marginBottom: 14,
					}}
				>
					<p
						style={{
							color: FC.amber,
							fontSize: 13,
							margin: 0,
							lineHeight: 1.5,
						}}
					>
						{structured.uncertaintyNote}
					</p>
				</div>
			) : null}

			{children}

			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginTop: 14,
					paddingTop: 12,
					borderTop: `1px solid ${FC.line}`,
				}}
			>
				<span
					style={{
						fontSize: 11,
						fontWeight: 700,
						color: confidenceColor(structured.confidenceLevel),
					}}
				>
					{structured.confidenceLevel === 'high'
						? 'High confidence'
						: structured.confidenceLevel === 'medium'
							? 'Moderate confidence'
							: 'Limited confidence'}
				</span>
				{structured.showSafetyFooter ? (
					<span style={{ fontSize: 10, color: FC.dim, textAlign: 'right' }}>
						Not medical advice
					</span>
				) : null}
			</div>
		</div>
	)
}
