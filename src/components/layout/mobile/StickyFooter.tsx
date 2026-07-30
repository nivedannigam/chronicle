import type { CSSProperties, ReactNode } from 'react'
import { C } from '@/constants/colors'
import { BOTTOM_SHEET_FOOTER_PADDING_BOTTOM } from '@/components/layout/mobile/mobile-layout.constants'

interface StickyFooterProps {
	children: ReactNode
	variant?: 'sheet' | 'page'
	style?: CSSProperties
}

export function StickyFooter({
	children,
	variant = 'sheet',
	style,
}: StickyFooterProps) {
	return (
		<div
			style={{
				flexShrink: 0,
				paddingTop: 12,
				paddingLeft: 18,
				paddingRight: 18,
				paddingBottom:
					variant === 'sheet' ? BOTTOM_SHEET_FOOTER_PADDING_BOTTOM : '12px',
				borderTop: `1px solid ${C.border}`,
				background: C.card,
				...style,
			}}
		>
			{children}
		</div>
	)
}
