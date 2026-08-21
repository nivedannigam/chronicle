/** Mask sensitive property registration / legal identifiers for consumer surfaces. */
export function maskPropertyIdentifier(
	value: string | null | undefined,
): string | null {
	if (!value?.trim()) {
		return null
	}

	const normalized = value.trim().replace(/\s+/g, '')

	if (normalized.length <= 4) {
		return '••••'
	}

	return `•••• ${normalized.slice(-4)}`
}

export function maskPropertyAddressLine(
	address: string | null | undefined,
): string | null {
	if (!address?.trim()) {
		return null
	}

	const parts = address
		.trim()
		.split(',')
		.map((part) => part.trim())

	if (parts.length <= 1) {
		return parts[0] ?? null
	}

	return `${parts[0]}, ${parts[parts.length - 1]}`
}
