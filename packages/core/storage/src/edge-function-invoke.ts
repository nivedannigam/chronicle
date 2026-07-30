import type { SupabaseClient } from '@supabase/supabase-js'

export interface EdgeFunctionInvokeDetails {
	functionName: string
	httpStatus?: number
	requestPayload: Record<string, unknown>
	responsePayload?: unknown
	durationMs: number
}

export class EdgeFunctionInvokeError extends Error {
	readonly functionName: string
	readonly httpStatus?: number
	readonly requestPayload: Record<string, unknown>
	readonly responsePayload?: unknown
	readonly durationMs: number

	constructor(details: EdgeFunctionInvokeDetails, message: string) {
		super(message)
		this.name = 'EdgeFunctionInvokeError'
		this.functionName = details.functionName
		this.httpStatus = details.httpStatus
		this.requestPayload = details.requestPayload
		this.responsePayload = details.responsePayload
		this.durationMs = details.durationMs
	}

	toDebugString(): string {
		const lines = [
			`Edge function: ${this.functionName}`,
			this.httpStatus != null ? `HTTP status: ${this.httpStatus}` : null,
			`Duration: ${this.durationMs}ms`,
			`Request: ${JSON.stringify(this.requestPayload)}`,
			this.responsePayload != null
				? `Response: ${JSON.stringify(this.responsePayload)}`
				: null,
			`Message: ${this.message}`,
		].filter(Boolean)

		return lines.join('\n')
	}
}

function readHttpStatus(error: unknown): number | undefined {
	if (!error || typeof error !== 'object') {
		return undefined
	}

	if ('context' in error) {
		const context = (
			error as { context?: { status?: number; statusCode?: number } }
		).context

		if (typeof context?.status === 'number') {
			return context.status
		}

		if (typeof context?.statusCode === 'number') {
			return context.statusCode
		}
	}

	return undefined
}

async function readResponsePayload(
	error: unknown,
	data: unknown,
): Promise<unknown> {
	if (data && typeof data === 'object') {
		return data
	}

	if (error && typeof error === 'object' && 'context' in error) {
		const context = (error as { context?: { json?: () => Promise<unknown> } })
			.context

		if (context?.json) {
			try {
				return await context.json()
			} catch {
				return undefined
			}
		}
	}

	return undefined
}

function readPayloadError(payload: unknown): string | null {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	if (
		'error' in payload &&
		typeof (payload as { error?: unknown }).error === 'string'
	) {
		return (payload as { error: string }).error
	}

	return null
}

export async function invokeEdgeFunction<T>(
	client: SupabaseClient,
	functionName: string,
	body: Record<string, unknown>,
): Promise<T> {
	const startedAt = performance.now()
	const durationMs = () => Math.round(performance.now() - startedAt)

	const { data, error } = await client.functions.invoke(functionName, {
		body,
	})

	const responsePayload = await readResponsePayload(error, data)
	const httpStatus = readHttpStatus(error)
	const payloadError = readPayloadError(responsePayload)

	if (error) {
		const message =
			payloadError ??
			(error instanceof Error ? error.message : `${functionName} invoke failed`)

		throw new EdgeFunctionInvokeError(
			{
				functionName,
				httpStatus,
				requestPayload: body,
				responsePayload,
				durationMs: durationMs(),
			},
			message.includes('non-2xx')
				? `${functionName} returned HTTP ${httpStatus ?? 'non-2xx'}: ${payloadError ?? message}`
				: message,
		)
	}

	const payload = data as T & { success?: boolean; error?: string }

	if (payload?.success === false || payload?.error) {
		throw new EdgeFunctionInvokeError(
			{
				functionName,
				httpStatus: httpStatus ?? 400,
				requestPayload: body,
				responsePayload: payload,
				durationMs: durationMs(),
			},
			payload.error ?? `${functionName} request failed`,
		)
	}

	if (payloadError) {
		throw new EdgeFunctionInvokeError(
			{
				functionName,
				httpStatus: httpStatus ?? 503,
				requestPayload: body,
				responsePayload,
				durationMs: durationMs(),
			},
			payloadError,
		)
	}

	return data as T
}

export type EdgeFunctionInvoker = <T>(
	functionName: string,
	body: Record<string, unknown>,
) => Promise<T>

export function createEdgeFunctionInvoker(
	client: SupabaseClient,
): EdgeFunctionInvoker {
	return (functionName, body) => invokeEdgeFunction(client, functionName, body)
}
