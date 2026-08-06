import { BottomSheet } from '@/components/layout/mobile/BottomSheet'
import { FC } from '@/ui/figma/v2/atoms'

export function HealthConfirmSheet({
	isOpen,
	title,
	message,
	confirmLabel = 'Continue',
	cancelLabel = 'Cancel',
	onConfirm,
	onCancel,
	isBusy = false,
	destructive = false,
}: {
	isOpen: boolean
	title: string
	message: string
	confirmLabel?: string
	cancelLabel?: string
	onConfirm: () => void
	onCancel: () => void
	isBusy?: boolean
	destructive?: boolean
}) {
	return (
		<BottomSheet
			isOpen={isOpen}
			onClose={onCancel}
			aria-label={title}
			header={
				<p
					style={{
						color: FC.fg,
						fontSize: 17,
						fontWeight: 700,
						margin: 0,
						letterSpacing: -0.3,
					}}
				>
					{title}
				</p>
			}
			footer={
				<div style={{ display: 'flex', gap: 10 }}>
					<button
						type="button"
						onClick={onCancel}
						disabled={isBusy}
						style={{
							flex: 1,
							background: FC.ghost,
							border: `1px solid ${FC.line}`,
							borderRadius: 14,
							padding: '13px 16px',
							color: FC.mid,
							fontSize: 14,
							fontWeight: 600,
							cursor: isBusy ? 'default' : 'pointer',
							fontFamily: 'inherit',
							opacity: isBusy ? 0.6 : 1,
						}}
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={isBusy}
						style={{
							flex: 1,
							background: destructive ? FC.orange : FC.blue,
							border: 'none',
							borderRadius: 14,
							padding: '13px 16px',
							color: '#fff',
							fontSize: 14,
							fontWeight: 700,
							cursor: isBusy ? 'default' : 'pointer',
							fontFamily: 'inherit',
							opacity: isBusy ? 0.7 : 1,
						}}
					>
						{confirmLabel}
					</button>
				</div>
			}
		>
			<p
				style={{
					color: FC.mid,
					fontSize: 14,
					lineHeight: 1.6,
					margin: 0,
				}}
			>
				{message}
			</p>
		</BottomSheet>
	)
}
