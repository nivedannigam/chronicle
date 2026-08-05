import type { ChronicleIntent } from '@/shared/ai/intent/intent.types'
import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'
import type { ToolPermissionLevel } from '@/shared/ai/tools/tool-permissions'

export interface ToolSchemaProperty {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object'
	description?: string
	items?: { type: string }
}

export interface ToolSchema {
	type: 'object'
	properties: Record<string, ToolSchemaProperty>
	required?: string[]
}

export interface ToolContext {
	userId: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
	memberName?: string | null
	role: ToolPermissionLevel
	domain: KnowledgeDomainId
	question: string
	intent: ChronicleIntent
	metricIds?: string[]
	metricNames?: string[]
	timeRangeYears?: number
	categoryId?: string
	reportId?: string
	reportIds?: string[]
	knowledge: HealthKnowledge
	signal?: AbortSignal
}

export interface ToolResult<TOutput = unknown> {
	success: boolean
	tool: string
	domain: KnowledgeDomainId
	data: TOutput
	confidence: number
	executionTimeMs: number
	inputSizeChars: number
	outputSizeChars: number
	retryCount: number
	error?: string
}

export interface HealthToolPayload {
	items: Array<{
		id: string
		type: string
		label: string
		data: Record<string, unknown>
	}>
	excluded: string[]
	confidence: number
}

export interface ChronicleTool<
	TInput = Record<string, unknown>,
	TOutput = unknown,
> {
	readonly name: string
	readonly domain: KnowledgeDomainId
	readonly description: string
	readonly inputSchema: ToolSchema
	readonly outputSchema: ToolSchema
	readonly timeoutMs: number
	readonly permissions: ToolPermissionLevel[]
	readonly estimatedCostUsd: number
	readonly supportedIntents: ChronicleIntent[]
	execute(context: ToolContext, input: TInput): Promise<ToolResult<TOutput>>
}

export interface ToolSelection {
	toolName: string
	input: Record<string, unknown>
	reason: string
}

export class ToolError extends Error {
	code:
		| 'not_found'
		| 'permission_denied'
		| 'timeout'
		| 'validation_failed'
		| 'execution_failed'

	constructor(
		message: string,
		code:
			| 'not_found'
			| 'permission_denied'
			| 'timeout'
			| 'validation_failed'
			| 'execution_failed',
	) {
		super(message)
		this.name = 'ToolError'
		this.code = code
	}
}
