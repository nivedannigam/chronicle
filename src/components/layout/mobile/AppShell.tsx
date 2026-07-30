import type { CSSProperties, ReactNode } from 'react'
import { ScrollablePage } from '@/components/layout/mobile/ScrollablePage'
import { StickyFooter } from '@/components/layout/mobile/StickyFooter'

interface AppShellProps {
	header?: ReactNode
	footer?: ReactNode
	children: ReactNode
	paddingX?: number
	paddingTop?: number
	paddingBottom?: number
	style?: CSSProperties
	/** When true, skip nav clearance on the scroll area (inside another AppShell). */
	nested?: boolean
}

/**
 * Standard mobile page shell: fixed header, scrollable body, optional sticky footer.
 * Footer stays above the floating bottom nav; scroll area clears nav when no footer.
 */
export function AppShell({
	header,
	footer,
	children,
	paddingX = 18,
	paddingTop = 0,
	paddingBottom = 0,
	style,
	nested = false,
}: AppShellProps) {
	const skipScrollBottomInset = nested || Boolean(footer)

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				minHeight: 0,
				flex: 1,
				overflow: 'hidden',
				...style,
			}}
		>
			{header ? <div style={{ flexShrink: 0 }}>{header}</div> : null}

			<ScrollablePage
				paddingX={paddingX}
				paddingTop={paddingTop}
				paddingBottom={paddingBottom}
				noBottomInset={skipScrollBottomInset}
			>
				{children}
			</ScrollablePage>

			{footer ? <StickyFooter variant="page">{footer}</StickyFooter> : null}
		</div>
	)
}
