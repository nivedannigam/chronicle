import { supabase } from '@/lib/supabase'
import {
	canTransition,
	mapDiscoveryCategoryToInitialState,
	publishWorkflowEvent,
	type WorkflowEventType,
	type WorkflowItem,
	type WorkflowState,
	type WorkflowTransitionContext,
} from '@/core/workflow'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import { invalidateHealthKnowledgeCache } from '@/features/health-knowledge/services/health-knowledge-cache'

function mapRow(row: Record<string, unknown>): WorkflowItem {
	return {
		id: row.id as string,
		userId: row.user_id as string,
		registryId: (row.registry_id as string | null) ?? null,
		reportId: (row.report_id as string | null) ?? null,
		familyMemberId: (row.family_member_id as string | null) ?? null,
		externalFileId: (row.external_file_id as string | null) ?? null,
		fileName: (row.file_name as string | null) ?? null,
		currentState: row.current_state as WorkflowState,
		previousState: (row.previous_state as WorkflowState | null) ?? null,
		failureReason: (row.failure_reason as string | null) ?? null,
		retryCount: Number(row.retry_count ?? 0),
		discoveryCategory: (row.discovery_category as string | null) ?? null,
		approvalStatus:
			(row.approval_status as WorkflowItem['approvalStatus']) ?? 'pending',
		metadata: (row.metadata as Record<string, unknown>) ?? {},
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
		completedAt: (row.completed_at as string | null) ?? null,
	}
}

function eventTypeForTransition(
	from: WorkflowState | null,
	to: WorkflowState,
): WorkflowEventType {
	if (to === 'APPROVED') return 'workflow.approved'
	if (to === 'REJECTED') return 'workflow.rejected'
	if (to === 'IMPORTING') return 'workflow.import_started'
	if (to === 'PROCESSING') return 'workflow.processing_started'
	if (to === 'OCR_COMPLETE') return 'workflow.ocr_complete'
	if (to === 'PARSED') return 'workflow.parsed'
	if (to === 'READY') return 'workflow.ready'
	if (to === 'FAILED') return 'workflow.failed'
	if (from === 'FAILED' && to === 'QUEUED') return 'workflow.retry'
	return 'workflow.transitioned'
}

async function syncLegacyRegistryState(
	registryId: string | null | undefined,
	state: WorkflowState,
	approvalStatus: WorkflowItem['approvalStatus'],
	failureReason?: string | null,
) {
	if (!registryId) {
		return
	}

	const importStatus = mapWorkflowToImportStatus(state)
	const payload: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	}

	if (importStatus) {
		payload.import_status = importStatus
	}

	if (approvalStatus) {
		payload.approval_status = approvalStatus
	}

	if (failureReason !== undefined) {
		payload.error_message = failureReason
	}

	if (state === 'READY') {
		payload.registry_status = 'completed'
		payload.knowledge_graph_status = 'indexed'
	}

	if (state === 'FAILED') {
		payload.registry_status = 'failed'
	}

	await supabase
		.from('connector_document_registry')
		.update(payload)
		.eq('id', registryId)
}

function mapWorkflowToImportStatus(state: WorkflowState): string | null {
	switch (state) {
		case 'DISCOVERED':
		case 'PENDING_REVIEW':
			return 'discovered'
		case 'APPROVED':
			return 'discovered'
		case 'QUEUED':
			return 'queued'
		case 'IMPORTING':
			return 'downloading'
		case 'PROCESSING':
			return 'ocr'
		case 'OCR_COMPLETE':
			return 'ocr'
		case 'PARSED':
			return 'parsing'
		case 'READY':
			return 'completed'
		case 'FAILED':
			return 'failed'
		case 'SKIPPED':
			return 'skipped'
		case 'REJECTED':
			return 'discovered'
		default:
			return null
	}
}

export async function getWorkflowItemByRegistryId(
	registryId: string,
): Promise<WorkflowItem | null> {
	const { data, error } = await supabase
		.from('health_workflow_items')
		.select('*')
		.eq('registry_id', registryId)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return data ? mapRow(data as Record<string, unknown>) : null
}

export async function getWorkflowItemByReportId(
	reportId: string,
): Promise<WorkflowItem | null> {
	const { data, error } = await supabase
		.from('health_workflow_items')
		.select('*')
		.eq('report_id', reportId)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return data ? mapRow(data as Record<string, unknown>) : null
}

export async function listWorkflowItemsForUser(
	userId: string,
): Promise<WorkflowItem[]> {
	const { data, error } = await supabase
		.from('health_workflow_items')
		.select('*')
		.eq('user_id', userId)
		.order('updated_at', { ascending: false })

	if (error) {
		throw new Error(error.message)
	}

	return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

export async function ensureWorkflowItemForRegistry(
	context: WorkflowTransitionContext & {
		discoveryCategory?: string | null
	},
): Promise<WorkflowItem> {
	if (!context.registryId) {
		throw new Error('registryId is required to ensure workflow item')
	}

	const existing = await getWorkflowItemByRegistryId(context.registryId)

	if (existing) {
		return existing
	}

	const initialState = mapDiscoveryCategoryToInitialState(
		context.discoveryCategory,
	)

	const { data, error } = await supabase
		.from('health_workflow_items')
		.insert({
			user_id: context.userId,
			registry_id: context.registryId,
			report_id: context.reportId ?? null,
			family_member_id: context.familyMemberId ?? null,
			external_file_id: context.externalFileId ?? null,
			file_name: context.fileName ?? null,
			current_state: initialState,
			discovery_category: context.discoveryCategory ?? null,
			approval_status: 'pending',
			metadata: context.metadata ?? {},
		})
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	const item = mapRow(data as Record<string, unknown>)

	await publishWorkflowEvent({
		id: crypto.randomUUID(),
		workflowItemId: item.id,
		userId: context.userId,
		fromState: null,
		toState: initialState,
		eventType: 'workflow.created',
		payload: { registryId: context.registryId },
		createdAt: new Date().toISOString(),
	})

	return item
}

export async function transitionWorkflowItem(input: {
	workflowItemId?: string
	registryId?: string
	reportId?: string
	toState: WorkflowState
	context?: Partial<WorkflowTransitionContext>
	approvalStatus?: WorkflowItem['approvalStatus']
	incrementRetry?: boolean
}): Promise<WorkflowItem> {
	let item: WorkflowItem | null = null

	if (input.workflowItemId) {
		const { data, error } = await supabase
			.from('health_workflow_items')
			.select('*')
			.eq('id', input.workflowItemId)
			.single()

		if (error) {
			throw new Error(error.message)
		}

		item = mapRow(data as Record<string, unknown>)
	} else if (input.registryId) {
		item = await getWorkflowItemByRegistryId(input.registryId)
	} else if (input.reportId) {
		item = await getWorkflowItemByReportId(input.reportId)
	}

	if (!item) {
		throw new Error('Workflow item not found for transition')
	}

	const fromState = item.currentState
	const toState = input.toState

	if (!canTransition(fromState, toState) && fromState !== toState) {
		throw new Error(`Invalid workflow transition: ${fromState} → ${toState}`)
	}

	const now = new Date().toISOString()
	const approvalStatus = input.approvalStatus ?? item.approvalStatus
	const failureReason =
		input.context?.failureReason !== undefined
			? input.context.failureReason
			: toState === 'FAILED'
				? item.failureReason
				: null

	const updatePayload: Record<string, unknown> = {
		previous_state: fromState,
		current_state: toState,
		approval_status: approvalStatus,
		updated_at: now,
		failure_reason: failureReason,
	}

	if (input.context?.reportId) {
		updatePayload.report_id = input.context.reportId
	}

	if (input.context?.familyMemberId) {
		updatePayload.family_member_id = input.context.familyMemberId
	}

	if (toState === 'READY') {
		updatePayload.completed_at = now
	}

	if (input.incrementRetry) {
		updatePayload.retry_count = item.retryCount + 1
	}

	const { data, error } = await supabase
		.from('health_workflow_items')
		.update(updatePayload)
		.eq('id', item.id)
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	const updated = mapRow(data as Record<string, unknown>)

	await syncLegacyRegistryState(
		updated.registryId,
		toState,
		approvalStatus,
		failureReason,
	)

	const eventType = eventTypeForTransition(fromState, toState)

	const { data: eventRow, error: eventError } = await supabase
		.from('health_workflow_events')
		.insert({
			workflow_item_id: updated.id,
			user_id: updated.userId,
			from_state: fromState,
			to_state: toState,
			event_type: eventType,
			payload: input.context?.metadata ?? {},
		})
		.select('*')
		.single()

	if (eventError) {
		throw new Error(eventError.message)
	}

	await publishWorkflowEvent({
		id: eventRow.id as string,
		workflowItemId: updated.id,
		userId: updated.userId,
		fromState,
		toState,
		eventType,
		payload: (eventRow.payload as Record<string, unknown>) ?? {},
		createdAt: eventRow.created_at as string,
	})

	return updated
}

/** Register platform-wide side effects for health workflow events */
export function registerHealthWorkflowHandlers(): void {
	// See health-workflow-bootstrap.ts
}

import type { WorkflowEvent } from '@/core/workflow'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import { invalidateHealthKnowledgeCache } from '@/features/health-knowledge/services/health-knowledge-cache'

export async function handleHealthWorkflowSideEffects(
	event: WorkflowEvent,
): Promise<void> {
	const userId = event.userId

	if (
		event.eventType === 'workflow.ready' ||
		event.eventType === 'workflow.parsed' ||
		event.eventType === 'workflow.failed' ||
		event.eventType === 'workflow.approved'
	) {
		invalidateHealthKnowledgeCache(userId)
		invalidateAfterHealthImport(userId)
	}
}
