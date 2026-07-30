import { useEffect, useState } from 'react'

function readKeyboardInset(): number {
	if (typeof window === 'undefined') {
		return 0
	}

	const viewport = window.visualViewport

	if (!viewport) {
		return 0
	}

	return Math.round(
		Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop),
	)
}

/** Bottom inset when the mobile keyboard is open (visual viewport shrink). */
export function useVisualViewportInset(active: boolean): number {
	const [inset, setInset] = useState(0)

	useEffect(() => {
		if (!active || typeof window === 'undefined') {
			return
		}

		const viewport = window.visualViewport

		if (!viewport) {
			return
		}

		const updateInset = () => {
			setInset(readKeyboardInset())
		}

		updateInset()
		viewport.addEventListener('resize', updateInset)
		viewport.addEventListener('scroll', updateInset)
		window.addEventListener('orientationchange', updateInset)

		return () => {
			viewport.removeEventListener('resize', updateInset)
			viewport.removeEventListener('scroll', updateInset)
			window.removeEventListener('orientationchange', updateInset)
		}
	}, [active])

	return active ? inset : 0
}
