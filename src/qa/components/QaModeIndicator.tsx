import { isQaModeEnabled } from '@/qa/qa-mode'

export function QaModeIndicator() {
	if (!isQaModeEnabled()) {
		return null
	}

	return (
		<div
			data-testid="qa-mode-indicator"
			style={{
				position: 'fixed',
				top: 8,
				right: 8,
				zIndex: 9999,
				background: 'rgba(255, 159, 10, 0.92)',
				color: '#111',
				fontSize: 10,
				fontWeight: 800,
				letterSpacing: '0.08em',
				padding: '4px 8px',
				borderRadius: 999,
				pointerEvents: 'none',
				boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
			}}
		>
			QA MODE
		</div>
	)
}
