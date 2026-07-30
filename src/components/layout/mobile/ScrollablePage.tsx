import type { CSSProperties, ReactNode } from 'react'
import {
	PAGE_CONTENT_BOTTOM_INSET,
	scrollablePageStyle,
} from '@/components/layout/mobile/mobile-layout.constants'

interface ScrollablePageProps {
	children: ReactNode
	/** Horizontal padding in pixels. */
	paddingX?: number
	paddingTop?: number
	/** Extra bottom padding added on top of nav clearance. */
	paddingBottom?: number
	style?: CSSProperties
	noBottomInset?: boolean
}

export function ScrollablePage({
	children,
	paddingX = 18,
	paddingTop = 0,
	paddingBottom = 0,
	style,
	noBottomInset = false,
}: ScrollablePageProps) {
	const bottomInset = noBottomInset
		? `${paddingBottom}px`
		: paddingBottom > 0
			? `calc(${paddingBottom}px + ${PAGE_CONTENT_BOTTOM_INSET})`
			: PAGE_CONTENT_BOTTOM_INSET

	return (
		<div
			style={{
				...scrollablePageStyle,
				paddingTop,
				paddingLeft: paddingX,
				paddingRight: paddingX,
				paddingBottom: bottomInset,
				...style,
			}}
		>
			{children}
		</div>
	)
}
