function findScrollableParent(element: HTMLElement): HTMLElement | null {
	let current: HTMLElement | null = element.parentElement

	while (current) {
		const style = getComputedStyle(current)

		if (
			/(auto|scroll)/.test(style.overflowY) &&
			current.scrollHeight > current.clientHeight
		) {
			return current
		}

		current = current.parentElement
	}

	return null
}

/** Scrolls the nearest scroll container (or window) so `elementId` is visible. */
export function scrollToSectionElement(
	elementId: string,
	options: { behavior?: ScrollBehavior; offset?: number } = {},
): boolean {
	const element = document.getElementById(elementId)

	if (!element) {
		return false
	}

	const behavior = options.behavior ?? 'smooth'
	const offset = options.offset ?? 12
	const scrollParent = findScrollableParent(element)

	if (scrollParent) {
		const parentRect = scrollParent.getBoundingClientRect()
		const elementRect = element.getBoundingClientRect()
		const top =
			elementRect.top - parentRect.top + scrollParent.scrollTop - offset

		scrollParent.scrollTo({ top: Math.max(0, top), behavior })
	} else {
		element.scrollIntoView({ behavior, block: 'start' })
	}

	return true
}
