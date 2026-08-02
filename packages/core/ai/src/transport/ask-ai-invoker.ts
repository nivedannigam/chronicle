export type AskAiInvoker = (
	body: Record<string, unknown>,
) => Promise<Record<string, unknown>>

let askAiInvoker: AskAiInvoker | null = null

export function registerAskAiInvoker(invoker: AskAiInvoker): void {
	askAiInvoker = invoker
}

export function getAskAiInvoker(): AskAiInvoker | null {
	return askAiInvoker
}

export async function invokeAskAiThroughRegistry(
	body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	if (!askAiInvoker) {
		throw new Error(
			'Ask AI invoker is not registered. The app must register supabase.functions.invoke("ask-ai") at startup.',
		)
	}

	return askAiInvoker(body)
}
