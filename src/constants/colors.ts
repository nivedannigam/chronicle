export const C = {
	bg: '#09090B',
	card: '#141418',
	card2: '#1A1A24',
	border: 'rgba(255,255,255,0.07)',
	borderFaint: 'rgba(255,255,255,0.04)',
	accent: '#6C6FFF',
	accentBlue: '#3D8CF0',
	accentDim: 'rgba(108,111,255,0.14)',
	accentBlueDim: 'rgba(61,140,240,0.14)',
	text: '#FFFFFF',
	textSec: 'rgba(255,255,255,0.55)',
	textMuted: 'rgba(255,255,255,0.28)',
	green: '#32D5A8',
	greenAlt: '#30D158',
	orange: '#FF9F0A',
	red: '#FF453A',
	teal: '#2DCFC1',
	yellow: '#FFD60A',
	photos: '#E879F9',
	outerBg: '#06060A',
	white: '#fff',
} as const

export function isStandaloneDisplayMode(): boolean {
	if (typeof window === 'undefined') {
		return false
	}

	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		window.matchMedia('(display-mode: fullscreen)').matches ||
		window.matchMedia('(display-mode: minimal-ui)').matches ||
		// iOS Safari — added to Home Screen
		(window.navigator as Navigator & { standalone?: boolean }).standalone ===
			true
	)
}

/** True on phones/tablets — not the desktop dev preview frame. */
export function isMobileDevice(): boolean {
	if (typeof window === 'undefined') {
		return false
	}

	return (
		window.matchMedia('(max-width: 768px)').matches ||
		/iPhone|iPad|iPod|Android/i.test(window.navigator.userAgent)
	)
}

/** Decorative phone frame only on desktop browser tabs. */
export function shouldShowPhoneFrame(): boolean {
	return !isStandaloneDisplayMode() && !isMobileDevice()
}

/** Fake iOS status bar only inside the desktop phone-frame preview. */
export function shouldShowDecorativeStatusBar(): boolean {
	return shouldShowPhoneFrame()
}

/** Shared scroll panel inside the app shell (requires flex parent with minHeight: 0). */
export const shellScrollContentStyle = {
	flex: 1,
	minHeight: 0,
	overflowY: 'auto' as const,
	overflowX: 'hidden' as const,
	scrollbarWidth: 'none' as const,
	WebkitOverflowScrolling: 'touch' as const,
}

/** Floating bottom nav dock — pinned above scrollable content. */
export function shellNavDockStyle(usePhoneFrame: boolean) {
	return {
		position: (usePhoneFrame ? 'absolute' : 'fixed') as 'absolute' | 'fixed',
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 200,
		pointerEvents: 'none' as const,
		padding: `0 20px calc(22px + env(safe-area-inset-bottom, 0px) + var(--mobile-browser-chrome, 0px))`,
		background:
			'linear-gradient(to top, rgba(9,9,11,0.94) 0%, rgba(9,9,11,0.55) 52%, transparent 100%)',
	}
}

import {
	BOTTOM_NAV_DOCK_PADDING_PX,
	BOTTOM_NAV_HEIGHT_PX,
	CONTENT_NAV_SPACING_PX,
} from '@/components/layout/mobile/mobile-layout.constants'

export const NAV_DOCK_CONTENT_INSET = `calc(${BOTTOM_NAV_HEIGHT_PX}px + ${BOTTOM_NAV_DOCK_PADDING_PX}px + ${CONTENT_NAV_SPACING_PX}px + env(safe-area-inset-bottom, 0px) + var(--mobile-browser-chrome, 0px))`

export const phoneFrameStyle = {
	outer: {
		minHeight: '100vh',
		background: C.outerBg,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: '32px 16px',
	} as const,
	inner: {
		width: 393,
		height: 852,
		background: C.bg,
		borderRadius: 54,
		overflow: 'hidden' as const,
		position: 'relative' as const,
		border: '1px solid rgba(255,255,255,0.09)',
		boxShadow:
			'0 60px 120px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04) inset',
		fontFamily:
			'-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
		WebkitFontSmoothing: 'antialiased' as const,
		display: 'flex' as const,
		flexDirection: 'column' as const,
	},
	content: {
		...shellScrollContentStyle,
		paddingBottom: NAV_DOCK_CONTENT_INSET,
	},
}

/** Extra bottom inset when Safari/Chrome browser chrome is visible. */
export function mobileBrowserChromeInset(): string {
	return isMobileDevice() && !isStandaloneDisplayMode() ? '52px' : '0px'
}

export const standaloneLayoutStyle = {
	outer: {
		flex: 1,
		minHeight: 0,
		height: '100dvh',
		background: C.bg,
		display: 'flex',
		flexDirection: 'column' as const,
		fontFamily:
			'-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
		WebkitFontSmoothing: 'antialiased' as const,
		paddingTop: 'env(safe-area-inset-top)',
		overflow: 'hidden' as const,
	} as const,
	inner: {
		flex: 1,
		minHeight: 0,
		display: 'flex',
		flexDirection: 'column' as const,
		background: C.bg,
		position: 'relative' as const,
		overflow: 'hidden' as const,
	} as const,
	content: {
		...shellScrollContentStyle,
		paddingBottom: NAV_DOCK_CONTENT_INSET,
	} as const,
}

/** Full-viewport layout for mobile Safari / Chrome (not the desktop preview frame). */
export const mobileBrowserLayoutStyle = standaloneLayoutStyle

export const pagePadding = {
	home: '16px 18px 20px',
	ask: '20px 18px 0',
	more: '18px 18px 20px',
} as const

export const stickyHeaderStyle = {
	position: 'sticky' as const,
	top: 0,
	zIndex: 10,
	background: C.bg,
	paddingTop: 18,
	paddingBottom: 14,
	paddingLeft: 18,
	paddingRight: 18,
	borderBottom: `1px solid ${C.border}`,
}

export const screenTitleStyle = {
	fontSize: 34,
	fontWeight: 800,
	letterSpacing: '-0.03em',
} as const
