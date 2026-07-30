/** Floating bottom nav pill height (includes elevated Ask tab). */
export const BOTTOM_NAV_HEIGHT_PX = 88

/** Space between scroll content and the floating nav dock. */
export const CONTENT_NAV_SPACING_PX = 16

/** Dock padding below the nav pill (matches shellNavDockStyle). */
export const BOTTOM_NAV_DOCK_PADDING_PX = 22

/**
 * Bottom padding for page scroll areas so content clears the floating nav.
 * Formula: nav height + dock padding + spacing + safe area + mobile browser chrome.
 */
export const PAGE_CONTENT_BOTTOM_INSET = `calc(${BOTTOM_NAV_HEIGHT_PX}px + ${BOTTOM_NAV_DOCK_PADDING_PX}px + ${CONTENT_NAV_SPACING_PX}px + env(safe-area-inset-bottom, 0px) + var(--mobile-browser-chrome, 0px))`

/**
 * Max height for mobile bottom sheets.
 * Uses dvh and subtracts safe areas + overlay padding so the panel (and footer)
 * never extends below the visible viewport.
 */
export const BOTTOM_SHEET_MAX_HEIGHT =
	'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 28px)'

/** Safe-area padding for sheet footers (iPhone home indicator). */
export const BOTTOM_SHEET_FOOTER_PADDING_BOTTOM =
	'calc(12px + env(safe-area-inset-bottom, 0px))'

export const scrollablePageStyle = {
	flex: 1,
	minHeight: 0,
	overflowY: 'auto' as const,
	overflowX: 'hidden' as const,
	WebkitOverflowScrolling: 'touch' as const,
	scrollbarWidth: 'none' as const,
}
