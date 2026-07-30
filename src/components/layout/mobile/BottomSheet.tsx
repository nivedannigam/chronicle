import type { CSSProperties, ReactNode } from 'react'
import { C } from '@/constants/colors'
import { StickyFooter } from '@/components/layout/mobile/StickyFooter'
import {
	BOTTOM_SHEET_MAX_HEIGHT,
	scrollablePageStyle,
} from '@/components/layout/mobile/mobile-layout.constants'
import { useBodyScrollLock } from '@/components/layout/mobile/useBodyScrollLock'
import { useVisualViewportInset } from '@/components/layout/mobile/useVisualViewportInset'

interface BottomSheetProps {
	isOpen: boolean
	onClose?: () => void
	header?: ReactNode
	footer?: ReactNode
	children: ReactNode
	preventClose?: boolean
	maxWidth?: number
	panelStyle?: CSSProperties
	'aria-label'?: string
}

export function BottomSheet({
	isOpen,
	onClose,
	header,
	footer,
	children,
	preventClose = false,
	maxWidth = 520,
	panelStyle,
	'aria-label': ariaLabel,
}: BottomSheetProps) {
	useBodyScrollLock(isOpen)
	const keyboardInset = useVisualViewportInset(isOpen)

	if (!isOpen) {
		return null
	}

	const canClose = !preventClose && onClose

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={ariaLabel}
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.55)',
				display: 'flex',
				alignItems: 'flex-end',
				justifyContent: 'center',
				zIndex: 1000,
				paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
				paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
				paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
				paddingBottom: `max(16px, calc(env(safe-area-inset-bottom, 0px) + ${keyboardInset}px))`,
				boxSizing: 'border-box',
			}}
			onClick={canClose ? onClose : undefined}
		>
			<div
				style={{
					width: '100%',
					maxWidth,
					maxHeight: BOTTOM_SHEET_MAX_HEIGHT,
					height: `min(${BOTTOM_SHEET_MAX_HEIGHT}, calc(100% - env(safe-area-inset-top, 0px)))`,
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: '24px 24px 20px 20px',
					boxShadow: '0 -12px 40px rgba(0,0,0,0.35)',
					display: 'flex',
					flexDirection: 'column',
					overflow: 'hidden',
					minHeight: 0,
					...panelStyle,
				}}
				onClick={(event) => event.stopPropagation()}
			>
				<div
					style={{
						width: 42,
						height: 4,
						borderRadius: 999,
						background: C.border,
						margin: '10px auto 0',
						flexShrink: 0,
					}}
				/>

				{header ? (
					<div
						style={{
							flexShrink: 0,
							padding: '12px 18px 10px',
							borderBottom: `1px solid ${C.border}`,
						}}
					>
						{header}
					</div>
				) : null}

				<div
					style={{
						...scrollablePageStyle,
						flex: '1 1 0',
						minHeight: 0,
						padding: header ? '12px 18px' : '12px 18px',
						overscrollBehavior: 'contain',
						touchAction: 'pan-y',
					}}
				>
					{children}
				</div>

				{footer ? <StickyFooter variant="sheet">{footer}</StickyFooter> : null}
			</div>
		</div>
	)
}
