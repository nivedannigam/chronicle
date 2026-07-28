import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import {
	isStandaloneDisplayMode,
	mobileBrowserLayoutStyle,
	phoneFrameStyle,
	shouldShowDecorativeStatusBar,
	shouldShowPhoneFrame,
	standaloneLayoutStyle,
} from '@/constants/colors'
import { FigmaBottomNav } from '@/ui/figma/shell/FigmaBottomNav'
import { FigmaStatusBar } from '@/ui/figma/shell/StatusBar'

function resolveShellLayout() {
	if (isStandaloneDisplayMode()) {
		return standaloneLayoutStyle
	}

	if (shouldShowPhoneFrame()) {
		return phoneFrameStyle
	}

	return mobileBrowserLayoutStyle
}

export function FigmaPhoneShell({ children }: { children?: ReactNode }) {
	const layout = resolveShellLayout()
	const showDecorativeStatusBar = shouldShowDecorativeStatusBar()

	return (
		<div style={layout.outer}>
			<div style={layout.inner}>
				{showDecorativeStatusBar ? <FigmaStatusBar /> : null}
				<div style={layout.content}>{children ?? <Outlet />}</div>
				<FigmaBottomNav />
			</div>
		</div>
	)
}
