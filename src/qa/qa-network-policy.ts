/**
 * QA network policy — documented allowlist for Playwright audits.
 * Critical unexpected 4xx/5xx outside this list should fail tests.
 */
export const QA_NETWORK_ALLOWLIST: Array<{
	pattern: RegExp
	statuses: number[]
	reason: string
}> = [
	{
		pattern: /supabase\.co/,
		statuses: [400, 401, 403, 404],
		reason:
			'Legacy client calls with synthetic QA JWT before interceptors hydrate',
	},
	{
		pattern: /googleapis\.com/,
		statuses: [401, 403],
		reason: 'Drive OAuth not configured in QA',
	},
	{
		pattern: /127\.0\.0\.1|localhost/,
		statuses: [400, 401, 404],
		reason: 'Local dev server asset or HMR requests',
	},
]

export const QA_CONSOLE_IGNORE: RegExp[] = [/Download the React DevTools/i]

export function isAllowlistedQaNetworkFailure(
	url: string,
	status: number,
): boolean {
	return QA_NETWORK_ALLOWLIST.some(
		(entry) => entry.pattern.test(url) && entry.statuses.includes(status),
	)
}

export function isIgnoredQaConsoleError(text: string): boolean {
	return QA_CONSOLE_IGNORE.some((pattern) => pattern.test(text))
}
