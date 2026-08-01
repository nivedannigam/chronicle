import { assertToolPermission } from '@/shared/ai/tools/tool-permissions'
import { recordToolExecution } from '@/shared/ai/tools/tool-observability'
import {
	defaultToolRegistry,
	type ToolRegistry,
} from '@/shared/ai/tools/tool-registry'
import {
	ToolError,
	type ChronicleTool,
	type ToolContext,
	type ToolResult,
	type ToolSchema,
} from '@/shared/ai/tools/tool.types'

function validateInput(
	schema: ToolSchema,
	input: Record<string, unknown>,
): void {
	for (const key of schema.required ?? []) {
		if (!(key in input)) {
			// Optional inputs are allowed — only validate provided fields
			continue
		}
	}

	for (const [key, value] of Object.entries(input)) {
		const property = schema.properties[key]

		if (!property) {
			throw new ToolError(
				`Unexpected input field "${key}" for tool execution.`,
				'validation_failed',
			)
		}

		if (property.type === 'array' && value != null && !Array.isArray(value)) {
			throw new ToolError(
				`Input field "${key}" must be an array.`,
				'validation_failed',
			)
		}

		if (
			property.type === 'number' &&
			value != null &&
			typeof value !== 'number'
		) {
			throw new ToolError(
				`Input field "${key}" must be a number.`,
				'validation_failed',
			)
		}

		if (
			property.type === 'string' &&
			value != null &&
			typeof value !== 'string'
		) {
			throw new ToolError(
				`Input field "${key}" must be a string.`,
				'validation_failed',
			)
		}
	}
}

function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	toolName: string,
	signal?: AbortSignal,
): Promise<T> {
	if (signal?.aborted) {
		return Promise.reject(
			new ToolError(`Tool "${toolName}" was aborted.`, 'execution_failed'),
		)
	}

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(
				new ToolError(
					`Tool "${toolName}" timed out after ${timeoutMs}ms.`,
					'timeout',
				),
			)
		}, timeoutMs)

		const onAbort = () => {
			clearTimeout(timer)
			reject(
				new ToolError(`Tool "${toolName}" was aborted.`, 'execution_failed'),
			)
		}

		signal?.addEventListener('abort', onAbort, { once: true })

		promise
			.then((value) => {
				clearTimeout(timer)
				signal?.removeEventListener('abort', onAbort)
				resolve(value)
			})
			.catch((error) => {
				clearTimeout(timer)
				signal?.removeEventListener('abort', onAbort)
				reject(error)
			})
	})
}

export interface ToolExecutorDeps {
	registry?: ToolRegistry
	maxRetries?: number
}

export class ToolExecutor {
	private readonly registry: ToolRegistry
	private readonly maxRetries: number

	constructor(deps: ToolExecutorDeps = {}) {
		this.registry = deps.registry ?? defaultToolRegistry
		this.maxRetries = deps.maxRetries ?? 0
	}

	async execute<TOutput = unknown>(
		toolName: string,
		context: ToolContext,
		input: Record<string, unknown> = {},
	): Promise<ToolResult<TOutput>> {
		const tool = this.registry.get(toolName)

		if (!tool) {
			const failure: ToolResult<TOutput> = {
				success: false,
				tool: toolName,
				domain: context.domain,
				data: null as TOutput,
				confidence: 0,
				executionTimeMs: 0,
				inputSizeChars: JSON.stringify(input).length,
				outputSizeChars: 0,
				retryCount: 0,
				error: `Tool "${toolName}" is not registered.`,
			}

			recordToolExecution(failure, failure.error)
			throw new ToolError(failure.error!, 'not_found')
		}

		assertToolPermission(tool, context)
		validateInput(tool.inputSchema, input)

		let retryCount = 0
		let lastError = ''
		const startedAt = Date.now()

		while (retryCount <= this.maxRetries) {
			try {
				const rawResult = await withTimeout(
					tool.execute(context, input),
					tool.timeoutMs,
					tool.name,
					context.signal,
				)

				const result: ToolResult<TOutput> = {
					...(rawResult as ToolResult<TOutput>),
					retryCount,
					executionTimeMs: Math.max(1, Date.now() - startedAt),
					inputSizeChars: JSON.stringify(input).length,
					outputSizeChars: JSON.stringify(rawResult.data).length,
				}

				recordToolExecution(result)
				return result
			} catch (error) {
				lastError =
					error instanceof Error ? error.message : 'Tool execution failed'

				if (error instanceof ToolError) {
					if (error.code === 'permission_denied' || error.code === 'timeout') {
						const failure: ToolResult<TOutput> = {
							success: false,
							tool: toolName,
							domain: context.domain,
							data: null as TOutput,
							confidence: 0,
							executionTimeMs: Math.max(1, Date.now() - startedAt),
							inputSizeChars: JSON.stringify(input).length,
							outputSizeChars: 0,
							retryCount,
							error: lastError,
						}

						recordToolExecution(failure, lastError)
						throw error
					}
				}

				retryCount += 1
			}
		}

		const failure: ToolResult<TOutput> = {
			success: false,
			tool: toolName,
			domain: context.domain,
			data: null as TOutput,
			confidence: 0,
			executionTimeMs: 0,
			inputSizeChars: JSON.stringify(input).length,
			outputSizeChars: 0,
			retryCount,
			error: lastError || 'Tool execution failed after retries',
		}

		recordToolExecution(failure, failure.error)
		throw new ToolError(failure.error!, 'execution_failed')
	}

	getTool(name: string): ChronicleTool | undefined {
		return this.registry.get(name)
	}
}

export const defaultToolExecutor = new ToolExecutor()
