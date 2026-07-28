import type { CSSProperties, ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import {
	isStandaloneDisplayMode,
	mobileBrowserChromeInset,
	mobileBrowserLayoutStyle,
	phoneFrameStyle,
	shouldShowDecorativeStatusBar,
	shouldShowPhoneFrame,
	shellNavDockStyle,
	shellScrollContentStyle,
	NAV_DOCK_CONTENT_INSET,
	standaloneLayoutStyle,
} from '@/constants/colors'
import { BrowserInstallBanner } from '@/ui/figma/shell/BrowserInstallBanner'
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
	const usePhoneFrame = shouldShowPhoneFrame()
	const browserChromeInset = mobileBrowserChromeInset()

	const outerStyle: CSSProperties = {
		...layout.outer,
		['--mobile-browser-chrome' as string]: browserChromeInset,
		...(usePhoneFrame
			? {}
			: {
					flex: 1,
					minHeight: 0,
					width: '100%',
				}),
	}

	const contentStyle: CSSProperties = {
		...shellScrollContentStyle,
		paddingBottom: NAV_DOCK_CONTENT_INSET,
	}

	const navDockStyle: CSSProperties = shellNavDockStyle(usePhoneFrame)

	return (
		<div style={outerStyle}>
			<div style={layout.inner}>
				{showDecorativeStatusBar ? <FigmaStatusBar /> : null}
				<BrowserInstallBanner />
				<div style={contentStyle}>{children ?? <Outlet />}</div>
				<div style={navDockStyle}>
					<FigmaBottomNav />
				</div>
			</div>
		</div>
	)
}
