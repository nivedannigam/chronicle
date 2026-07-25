import { AlertCircle, RefreshCw } from 'lucide-react'
import { C } from '@/constants/colors'

interface InlineErrorBannerProps {
	message?: string
	onRetry?: () => void
}

export function InlineErrorBanner({
	message = 'Something went wrong. Please try again.',
	onRetry,
}: InlineErrorBannerProps) {
	return (
		<div
			role="alert"
			style={{
				display: 'flex',
				alignItems: 'flex-start',
				gap: 10,
				padding: '14px 16px',
				borderRadius: 14,
				background: `${C.orange}12`,
				border: `1px solid ${C.orange}44`,
				marginBottom: 16,
			}}
		>
			<AlertCircle
				size={18}
				color={C.orange}
				style={{ flexShrink: 0, marginTop: 1 }}
			/>
			<div style={{ flex: 1 }}>
				<div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
					{message}
				</div>
				{onRetry ? (
					<button
						type="button"
						onClick={onRetry}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 5,
							marginTop: 8,
							fontSize: 12,
							fontWeight: 700,
							color: C.orange,
							background: 'transparent',
							border: `1px solid ${C.orange}55`,
							borderRadius: 100,
							padding: '6px 10px',
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						<RefreshCw size={13} />
						Try again
					</button>
				) : null}
			</div>
		</div>
	)
}
