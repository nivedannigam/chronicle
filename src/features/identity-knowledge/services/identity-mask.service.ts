export function maskDocumentNumber(
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
