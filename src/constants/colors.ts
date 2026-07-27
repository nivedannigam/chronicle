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
		// iOS Safari
		(window.navigator as Navigator & { standalone?: boolean }).standalone ===
			true
	)
}

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
		flex: 1,
		overflowY: 'auto' as const,
		overflowX: 'hidden' as const,
		scrollbarWidth: 'none' as const,
		paddingBottom: 110,
	},
}

export const standaloneLayoutStyle = {
	outer: {
		minHeight: '100dvh',
		background: C.bg,
		display: 'flex',
		flexDirection: 'column' as const,
		fontFamily:
			'-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
		WebkitFontSmoothing: 'antialiased' as const,
	} as const,
	inner: {
		flex: 1,
		display: 'flex',
		flexDirection: 'column' as const,
		minHeight: '100dvh',
		background: C.bg,
		position: 'relative' as const,
		overflow: 'hidden' as const,
	} as const,
	content: {
		flex: 1,
		overflowY: 'auto' as const,
		overflowX: 'hidden' as const,
		scrollbarWidth: 'none' as const,
		paddingBottom: 'calc(110px + env(safe-area-inset-bottom))',
	} as const,
}

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
