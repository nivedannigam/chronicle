import { Loader2, Send, X } from 'lucide-react'
import { C } from '@/constants/colors'
import { ASK_COPY } from '@/constants/product-copy'

interface AskSearchBarProps {
	value: string
	onChange: (value: string) => void
	onSubmit: () => void
	onCancel?: () => void
	isLoading?: boolean
}

export function AskSearchBar({
	value,
	onChange,
	onSubmit,
	onCancel,
	isLoading = false,
}: AskSearchBarProps) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				padding: '12px 14px 10px',
				marginBottom: 18,
				position: 'relative',
				minHeight: 88,
			}}
		>
			<textarea
				value={value}
				onChange={(event) => onChange(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault()
						onSubmit()
					}
				}}
				placeholder={ASK_COPY.placeholder}
				disabled={isLoading}
				style={{
					width: '100%',
					background: 'none',
					border: 'none',
					outline: 'none',
					fontSize: 15,
					color: C.text,
					fontFamily: 'inherit',
					resize: 'none',
					minHeight: 56,
					lineHeight: 1.5,
					opacity: isLoading ? 0.7 : 1,
				}}
			/>
			<button
				type="button"
				onClick={isLoading && onCancel ? onCancel : onSubmit}
				disabled={!isLoading && !value.trim()}
				style={{
					position: 'absolute',
					bottom: 12,
					right: 12,
					width: 36,
					height: 36,
					borderRadius: '50%',
					background: isLoading && onCancel ? C.card2 : C.accent,
					border: isLoading && onCancel ? `1px solid ${C.border}` : 'none',
					cursor: !isLoading && !value.trim() ? 'not-allowed' : 'pointer',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					boxShadow:
						isLoading && onCancel
							? 'none'
							: `0 4px 16px rgba(108,111,255,0.35)`,
					opacity: !isLoading && !value.trim() ? 0.6 : 1,
				}}
			>
				{isLoading ? (
					onCancel ? (
						<X size={16} color={C.textSec} />
					) : (
						<Loader2
							size={16}
							color="white"
							style={{ animation: 'spin 1s linear infinite' }}
						/>
					)
				) : (
					<Send size={16} color="white" strokeWidth={2} />
				)}
			</button>
		</div>
	)
}
