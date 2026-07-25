import { useState } from 'react'
import { Check, Copy, RefreshCw, SkipForward } from 'lucide-react'
import { C } from '@/constants/colors'

interface AskMessageActionsProps {
	answer: string
	onRegenerate?: () => void
	onContinue?: () => void
	isRegenerating?: boolean
	disabled?: boolean
}

export function AskMessageActions({
	answer,
	onRegenerate,
	onContinue,
	isRegenerating = false,
	disabled = false,
}: AskMessageActionsProps) {
	const [copied, setCopied] = useState(false)

	if (!answer.trim()) {
		return null
	}

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				flexWrap: 'wrap',
				gap: 6,
				marginTop: 10,
			}}
			role="toolbar"
			aria-label="Message actions"
		>
			<ActionButton
				label={copied ? 'Copied' : 'Copy response'}
				onClick={async () => {
					try {
						await navigator.clipboard.writeText(answer)
						setCopied(true)
						window.setTimeout(() => setCopied(false), 1800)
					} catch {
						// Clipboard unavailable.
					}
				}}
				disabled={disabled}
				icon={copied ? <Check size={14} /> : <Copy size={14} />}
			/>
			{onRegenerate ? (
				<ActionButton
					label="Regenerate"
					onClick={onRegenerate}
					disabled={disabled || isRegenerating}
					icon={
						<RefreshCw
							size={14}
							style={
								isRegenerating
									? { animation: 'spin 1s linear infinite' }
									: undefined
							}
						/>
					}
				/>
			) : null}
			{onContinue ? (
				<ActionButton
					label="Continue"
					onClick={onContinue}
					disabled={disabled || isRegenerating}
					icon={<SkipForward size={14} />}
				/>
			) : null}
		</div>
	)
}

function ActionButton({
	label,
	onClick,
	disabled,
	icon,
}: {
	label: string
	onClick: () => void
	disabled?: boolean
	icon: React.ReactNode
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			title={label}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 5,
				padding: '6px 10px',
				borderRadius: 100,
				border: `1px solid ${C.border}`,
				background: C.card2,
				color: C.textSec,
				fontSize: 11,
				fontWeight: 600,
				cursor: disabled ? 'not-allowed' : 'pointer',
				fontFamily: 'inherit',
				opacity: disabled ? 0.55 : 1,
			}}
		>
			{icon}
			{label}
		</button>
	)
}
