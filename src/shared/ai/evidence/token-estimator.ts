export function estimateTokensFromText(text: string): number {
	return Math.max(1, Math.ceil(text.length / 4))
}

export function estimateEvidenceTokens(input: {
	payload: unknown
	systemPrompt?: string
	developerPrompt?: string
	question: string
}): number {
	const body = JSON.stringify(input.payload)
	const total = [
		input.systemPrompt ?? '',
		input.developerPrompt ?? '',
		input.question,
		body,
	].join('\n')

	return estimateTokensFromText(total)
}
