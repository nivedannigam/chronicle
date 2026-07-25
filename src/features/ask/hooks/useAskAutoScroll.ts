import { useEffect, useRef } from 'react'

export function useAskAutoScroll(deps: unknown[]) {
	const bottomRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
	}, deps)

	return { containerRef, bottomRef }
}
