import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import {
	isStandaloneDisplayMode,
	phoneFrameStyle,
	standaloneLayoutStyle,
} from '@/constants/colors'
import { FigmaBottomNav } from '@/ui/figma/shell/FigmaBottomNav'
import { FigmaStatusBar } from '@/ui/figma/shell/StatusBar'

export function FigmaPhoneShell({ children }: { children?: ReactNode }) {
	const standalone = isStandaloneDisplayMode()
	const layout = standalone ? standaloneLayoutStyle : phoneFrameStyle

	return (
		<div style={layout.outer}>
			<div style={layout.inner}>
				<FigmaStatusBar />
				<div style={layout.content}>{children ?? <Outlet />}</div>
				<FigmaBottomNav />
			</div>
		</div>
	)
}
