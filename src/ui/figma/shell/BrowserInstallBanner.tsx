import { useState } from 'react'
import { X } from 'lucide-react'
import { isMobileDevice, isStandaloneDisplayMode } from '@/constants/colors'
import { FC } from '@/ui/figma/tokens/figma-v2-tokens'

const DISMISS_KEY = 'chronicle-install-banner-dismissed'

export function BrowserInstallBanner() {
	const [dismissed, setDismissed] = useState(() => {
		try {
			return sessionStorage.getItem(DISMISS_KEY) === '1'
		} catch {
			return false
		}
	})

	if (isStandaloneDisplayMode() || !isMobileDevice() || dismissed) {
		return null
	}

	return (
		<div
			style={{
				flexShrink: 0,
				margin: '0 16px 10px',
				padding: '12px 14px',
				borderRadius: 16,
				background: 'rgba(59,130,246,0.12)',
				border: '1px solid rgba(59,130,246,0.28)',
				display: 'flex',
				alignItems: 'flex-start',
				gap: 10,
			}}
		>
			<div style={{ flex: 1 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 13,
						fontWeight: 600,
						margin: '0 0 4px',
						lineHeight: 1.35,
					}}
				>
					Install Chronicle for the full app experience
				</p>
				<p
					style={{
						color: FC.mid,
						fontSize: 12,
						margin: 0,
						lineHeight: 1.45,
					}}
				>
					In Safari, tap Share →{' '}
					<strong style={{ color: FC.fg }}>Add to Home Screen</strong>. That
					removes the browser bar at the top and bottom.
				</p>
			</div>
			<button
				type="button"
				onClick={() => {
					setDismissed(true)
					try {
						sessionStorage.setItem(DISMISS_KEY, '1')
					} catch {
						// ignore
					}
				}}
				aria-label="Dismiss install hint"
				style={{
					background: 'none',
					border: 'none',
					padding: 4,
					cursor: 'pointer',
					flexShrink: 0,
				}}
			>
				<X size={16} color={FC.dim} />
			</button>
		</div>
	)
}
