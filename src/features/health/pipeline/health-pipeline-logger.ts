export type PipelineStage =
	| 'DISCOVERED'
	| 'QUEUED'
	| 'DOWNLOADING'
	| 'IMPORTING'
	| 'OCR'
	| 'PARSING'
	| 'INDEXING'
	| 'PENDING_REVIEW'
	| 'APPROVED'
	| 'READY'
	| 'FAILED'

export interface PipelineStageLog {
	registryId: string | null
	reportId: string | null
	stage: PipelineStage
	startedAt: string
	endedAt: string | null
	durationMs: number | null
	error: string | null
	nextStage: PipelineStage | null
	details: Record<string, unknown>
}

const stageLogs: PipelineStageLog[] = []
const activeStages = new Map<string, PipelineStageLog>()

function stageKey(registryId: string | null, reportId: string | null): string {
	return registryId ?? reportId ?? 'global'
}

export function startPipelineStage(input: {
	registryId?: string | null
	reportId?: string | null
	stage: PipelineStage
	nextStage?: PipelineStage | null
	details?: Record<string, unknown>
}): PipelineStageLog {
	const startedAt = new Date().toISOString()
	const key = stageKey(input.registryId ?? null, input.reportId ?? null)

	const previous = activeStages.get(key)

	if (previous && !previous.endedAt) {
		previous.endedAt = startedAt
		previous.durationMs = Date.parse(startedAt) - Date.parse(previous.startedAt)
	}

	const entry: PipelineStageLog = {
		registryId: input.registryId ?? null,
		reportId: input.reportId ?? null,
		stage: input.stage,
		startedAt,
		endedAt: null,
		durationMs: null,
		error: null,
		nextStage: input.nextStage ?? null,
		details: input.details ?? {},
	}

	activeStages.set(key, entry)
	stageLogs.unshift(entry)

	if (stageLogs.length > 200) {
		stageLogs.length = 200
	}

	if (import.meta.env.DEV) {
		console.info(
			`[health-pipeline] ${input.stage}`,
			input.details ?? {},
			input.nextStage ? `→ ${input.nextStage}` : '',
		)
	}

	return entry
}

export function completePipelineStage(input: {
	registryId?: string | null
	reportId?: string | null
	stage: PipelineStage
	nextStage?: PipelineStage | null
	details?: Record<string, unknown>
}): void {
	const key = stageKey(input.registryId ?? null, input.reportId ?? null)
	const entry = activeStages.get(key)
	const endedAt = new Date().toISOString()

	if (entry && entry.stage === input.stage) {
		entry.endedAt = endedAt
		entry.durationMs = Date.parse(endedAt) - Date.parse(entry.startedAt)
		entry.nextStage = input.nextStage ?? entry.nextStage

		if (input.details) {
			entry.details = { ...entry.details, ...input.details }
		}

		if (import.meta.env.DEV) {
			console.info(
				`[health-pipeline] ${input.stage} done (${entry.durationMs}ms)`,
				input.details ?? {},
				input.nextStage ? `→ ${input.nextStage}` : '',
			)
		}

		return
	}

	startPipelineStage(input)
	const created = activeStages.get(key)

	if (created) {
		created.endedAt = endedAt
		created.durationMs = Date.parse(endedAt) - Date.parse(created.startedAt)
	}
}

export function failPipelineStage(input: {
	registryId?: string | null
	reportId?: string | null
	stage: PipelineStage
	error: string
	details?: Record<string, unknown>
}): void {
	const key = stageKey(input.registryId ?? null, input.reportId ?? null)
	const entry = activeStages.get(key)
	const endedAt = new Date().toISOString()

	if (entry) {
		entry.endedAt = endedAt
		entry.durationMs = Date.parse(endedAt) - Date.parse(entry.startedAt)
		entry.error = input.error
		entry.nextStage = 'FAILED'

		if (input.details) {
			entry.details = { ...entry.details, ...input.details }
		}
	} else {
		stageLogs.unshift({
			registryId: input.registryId ?? null,
			reportId: input.reportId ?? null,
			stage: input.stage,
			startedAt: endedAt,
			endedAt,
			durationMs: 0,
			error: input.error,
			nextStage: 'FAILED',
			details: input.details ?? {},
		})
	}

	if (import.meta.env.DEV) {
		console.error(
			`[health-pipeline] ${input.stage} FAILED`,
			input.error,
			input.details ?? {},
		)
	}
}

export function getPipelineStageLogs(): PipelineStageLog[] {
	return [...stageLogs]
}

export function clearPipelineStageLogs(): void {
	stageLogs.length = 0
	activeStages.clear()
}
