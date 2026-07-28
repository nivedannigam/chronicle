import { useNavigate } from 'react-router-dom'
import { GitCompare, MessageCircle, Sparkles } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { FC } from '@/ui/figma/v2/atoms'

export function HealthAiActionRow({
	query,
	reportId,
	compact = false,
}: {
	query: string
	reportId?: string
	compact?: boolean
}) {
	const navigate = useNavigate()

	const ask = (prompt: string) =>
		navigate(`${ROUTES.ask}?q=${encodeURIComponent(prompt)}`)

	const actions = [
		{
			id: 'summarize',
			label: 'Summarize',
			icon: Sparkles,
			onClick: () =>
				ask(
					reportId
						? `Summarize my health report and explain the key findings in plain language.`
						: `Summarize: ${query}`,
				),
		},
		{
			id: 'compare',
			label: 'Compare',
			icon: GitCompare,
			onClick: () =>
				navigate(
					reportId
						? `${ROUTES.healthCompare}?reportId=${reportId}`
						: ROUTES.healthCompare,
				),
		},
		{
			id: 'ask',
			label: 'Ask',
			icon: MessageCircle,
			onClick: () => ask(query),
		},
	]

	return (
		<div
			style={{
				display: 'flex',
				gap: compact ? 6 : 8,
				flexWrap: 'wrap',
			}}
		>
			{actions.map(({ id, label, icon: Icon, onClick }) => (
				<button
					key={id}
					type="button"
					onClick={onClick}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 5,
						background: FC.surface,
						border: `1px solid ${FC.line}`,
						borderRadius: 100,
						padding: compact ? '6px 11px' : '8px 13px',
						cursor: 'pointer',
						fontFamily: 'inherit',
						minHeight: compact ? 32 : 36,
					}}
				>
					<Icon size={compact ? 12 : 13} color={FC.blue} strokeWidth={2} />
					<span
						style={{
							color: FC.mid,
							fontSize: compact ? 11.5 : 12.5,
							fontWeight: 600,
						}}
					>
						{label}
					</span>
				</button>
			))}
		</div>
	)
}

export function HealthAiBadge() {
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 4,
				background: 'rgba(59,130,246,0.12)',
				border: '1px solid rgba(59,130,246,0.22)',
				borderRadius: 100,
				padding: '3px 8px',
			}}
		>
			<Sparkles size={10} color={FC.blue} />
			<span style={{ color: FC.blue, fontSize: 10, fontWeight: 700 }}>AI</span>
		</span>
	)
}
