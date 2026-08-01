import type { ToolResult } from '@/shared/ai/tools/tool.types'

export interface ToolExecutionRecord {
	tool: string
	domain: string
	executionTimeMs: number
	inputSizeChars: number
	outputSizeChars: number
	success: boolean
	failure?: string
	retryCount: number
	confidence: number
	timestamp: string
}

const toolLog: ToolExecutionRecord[] = []

export function recordToolExecution(
	result: ToolResult,
	failure?: string,
): ToolExecutionRecord {
	const record: ToolExecutionRecord = {
		tool: result.tool,
		domain: result.domain,
		executionTimeMs: result.executionTimeMs,
		inputSizeChars: result.inputSizeChars,
		outputSizeChars: result.outputSizeChars,
		success: result.success,
		failure: failure ?? result.error,
		retryCount: result.retryCount,
		confidence: result.confidence,
		timestamp: new Date().toISOString(),
	}

	toolLog.push(record)

	if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
		console.debug('[chronicle-ai-tool]', record)
	}

	return record
}

export function getToolExecutionLog(): readonly ToolExecutionRecord[] {
	return toolLog
}

export function clearToolExecutionLog(): void {
	toolLog.length = 0
}
