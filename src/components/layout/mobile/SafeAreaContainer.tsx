import type { CSSProperties, ReactNode } from 'react'

interface SafeAreaContainerProps {
	children: ReactNode
	edges?: Array<'top' | 'bottom' | 'left' | 'right'>
	style?: CSSProperties
	className?: string
}

const EDGE_PADDING: Record<'top' | 'bottom' | 'left' | 'right', string> = {
	top: 'env(safe-area-inset-top, 0px)',
	bottom: 'env(safe-area-inset-bottom, 0px)',
	left: 'env(safe-area-inset-left, 0px)',
	right: 'env(safe-area-inset-right, 0px)',
}

export function SafeAreaContainer({
	children,
	edges = ['bottom'],
	style,
	className,
}: SafeAreaContainerProps) {
	const safePadding: CSSProperties = {}

	for (const edge of edges) {
		const key =
			edge === 'top'
				? 'paddingTop'
				: edge === 'bottom'
					? 'paddingBottom'
					: edge === 'left'
						? 'paddingLeft'
						: 'paddingRight'

		safePadding[key] = EDGE_PADDING[edge]
	}

	return (
		<div className={className} style={{ ...safePadding, ...style }}>
			{children}
		</div>
	)
}
