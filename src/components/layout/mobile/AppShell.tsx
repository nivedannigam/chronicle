import type { CSSProperties, ReactNode } from 'react'
import { ScrollablePage } from '@/components/layout/mobile/ScrollablePage'

interface AppShellProps {
	header?: ReactNode
	footer?: ReactNode
	children: ReactNode
	paddingX?: number
	paddingTop?: number
	paddingBottom?: number
	style?: CSSProperties
	nested?: boolean
}

/**
 * Standard mobile page shell: fixed header, scrollable body, optional footer.
 * Clears the floating bottom navigation via ScrollablePage bottom inset.
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
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				minHeight: 0,
				flex: 1,
				height: '100%',
				...style,
			}}
		>
			{header ? <div style={{ flexShrink: 0 }}>{header}</div> : null}

			<ScrollablePage
				paddingX={paddingX}
				paddingTop={paddingTop}
				paddingBottom={paddingBottom}
				noBottomInset={nested}
			>
				{children}
			</ScrollablePage>

			{footer ? <div style={{ flexShrink: 0 }}>{footer}</div> : null}
		</div>
	)
}
