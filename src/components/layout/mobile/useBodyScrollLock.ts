import { useEffect } from 'react'

/** Prevent background page scroll while overlays (bottom sheets) are open. */
export function useBodyScrollLock(locked: boolean): void {
	useEffect(() => {
		if (!locked || typeof document === 'undefined') {
			return
		}

		const { body } = document
		const previousOverflow = body.style.overflow
		const previousTouchAction = body.style.touchAction

		body.style.overflow = 'hidden'
		body.style.touchAction = 'none'

		return () => {
			body.style.overflow = previousOverflow
			body.style.touchAction = previousTouchAction
		}
	}, [locked])
}
