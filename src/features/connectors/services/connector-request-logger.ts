let requestCounter = 0

export function logConnectorRequest(
	source: string,
	endpoint: string,
	detail?: string,
) {
	requestCounter += 1

	if (!import.meta.env.DEV) {
		return
	}

	const suffix = detail ? ` (${detail})` : ''

	console.debug(
		`[connector #${requestCounter}] ${source} → ${endpoint}${suffix}`,
	)
}
