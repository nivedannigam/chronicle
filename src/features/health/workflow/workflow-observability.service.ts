import {
	normalizeLegacyWorkflowState,
	type WorkflowState,
} from '@/core/workflow'
import { assessReportArtifacts } from '@/features/health/services/report-readiness.service'
import type { UploadedHealthReport } from '@/features/health/types'
import type { WorkflowItem } from '@/core/workflow'
import { supabase } from '@/lib/supabase'

const STAGE_ORDER: WorkflowState[] = [
	'DISCOVERED',
	'PENDING_REVIEW',
	'APPROVED',
	'QUEUED',
	'DOWNLOADING',
	'IMPORTING',
	'OCR',
	'PARSING',
	'INDEXING',
	'READY',
]

function nextStage(current: WorkflowState): WorkflowState | null {
	const normalized = normalizeLegacyWorkflowState(current)
	const index = STAGE_ORDER.indexOf(normalized)

	if (index < 0 || index >= STAGE_ORDER.length - 1) {
		return null
	}

	return STAGE_ORDER[index + 1] ?? null
}

function stageDurationMs(
	startedAt: string | null,
	finishedAt: string | null,
): number | null {
	if (!startedAt) {
		return null
	}

	const end = finishedAt ? Date.parse(finishedAt) : Date.now()
	const start = Date.parse(startedAt)

	if (Number.isNaN(start) || Number.isNaN(end)) {
		return null
	}

	return Math.max(0, end - start)
}

export interface WorkflowObservabilitySnapshot {
	workflowId: string
	reportId: string | null
	registryId: string | null
	correlationId: string
	currentStage: WorkflowState
	lastCompletedStage: WorkflowState | null
	nextStage: WorkflowState | null
	durationMs: number | null
	retryCount: number
	failureReason: string | null
	failedStage: WorkflowState | null
	worker: string | null
	stageStartedAt: string | null
	stageFinishedAt: string | null
	completedAt: string | null
	reportStatus: string | null
	artifacts: ReturnType<typeof assessReportArtifacts> | null
}

export function buildWorkflowObservabilitySnapshot(input: {
	workflowItem: WorkflowItem
	report?: UploadedHealthReport | null
	storedMetricCount?: number
}): WorkflowObservabilitySnapshot {
	const { workflowItem, report } = input
	const currentStage = normalizeLegacyWorkflowState(workflowItem.currentState)
	const lastCompletedStage = workflowItem.previousState
		? normalizeLegacyWorkflowState(workflowItem.previousState)
		: null

	return {
		workflowId: workflowItem.id,
		reportId: workflowItem.reportId,
		registryId: workflowItem.registryId,
		correlationId: workflowItem.id,
		currentStage,
		lastCompletedStage,
		nextStage: nextStage(currentStage),
		durationMs: stageDurationMs(
			workflowItem.stageStartedAt,
			workflowItem.stageFinishedAt,
		),
		retryCount: workflowItem.retryCount,
		failureReason: workflowItem.failureReason,
		failedStage: workflowItem.failedStage
			? normalizeLegacyWorkflowState(workflowItem.failedStage)
			: null,
		worker: workflowItem.worker,
		stageStartedAt: workflowItem.stageStartedAt,
		stageFinishedAt: workflowItem.stageFinishedAt,
		completedAt: workflowItem.completedAt,
		reportStatus: report?.status ?? null,
		artifacts: report
			? assessReportArtifacts({
					report,
					storedMetricCount: input.storedMetricCount,
				})
			: null,
	}
}

export async function fetchWorkflowObservabilityForReport(
	reportId: string,
	report?: UploadedHealthReport | null,
): Promise<WorkflowObservabilitySnapshot | null> {
	const { data, error } = await supabase
		.from('health_workflow_items')
		.select('*')
		.eq('report_id', reportId)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	if (!data) {
		return null
	}

	let metricCount = 0

	const { count, error: metricError } = await supabase
		.from('health_metrics')
		.select('id', { count: 'exact', head: true })
		.eq('report_id', reportId)

	if (!metricError) {
		metricCount = count ?? 0
	}

	const workflowItem: WorkflowItem = {
		id: data.id as string,
		userId: data.user_id as string,
		registryId: (data.registry_id as string | null) ?? null,
		reportId: (data.report_id as string | null) ?? null,
		familyMemberId: (data.family_member_id as string | null) ?? null,
		externalFileId: (data.external_file_id as string | null) ?? null,
		fileName: (data.file_name as string | null) ?? null,
		currentState: normalizeLegacyWorkflowState(
			data.current_state as WorkflowState,
		),
		previousState: data.previous_state
			? normalizeLegacyWorkflowState(data.previous_state as WorkflowState)
			: null,
		failureReason: (data.failure_reason as string | null) ?? null,
		failedStage: data.failed_stage
			? normalizeLegacyWorkflowState(data.failed_stage as WorkflowState)
			: null,
		retryCount: Number(data.retry_count ?? 0),
		discoveryCategory: (data.discovery_category as string | null) ?? null,
		approvalStatus:
			(data.approval_status as WorkflowItem['approvalStatus']) ?? 'pending',
		metadata: (data.metadata as Record<string, unknown>) ?? {},
		progress: null,
		lastErrorDetail:
			(data.last_error_detail as Record<string, unknown> | null) ?? null,
		worker: (data.worker as string | null) ?? null,
		stageStartedAt: (data.stage_started_at as string | null) ?? null,
		stageFinishedAt: (data.stage_finished_at as string | null) ?? null,
		createdAt: data.created_at as string,
		updatedAt: data.updated_at as string,
		completedAt: (data.completed_at as string | null) ?? null,
	}

	return buildWorkflowObservabilitySnapshot({
		workflowItem,
		report,
		storedMetricCount: metricCount,
	})
}
