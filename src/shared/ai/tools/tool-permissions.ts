import { ToolError, type ToolContext } from '@/shared/ai/tools/tool.types'
import type { ChronicleTool } from '@/shared/ai/tools/tool.types'

export type ToolPermissionLevel =
	'current_user' | 'family_member' | 'admin' | 'read_only'

const ROLE_HIERARCHY: Record<ToolPermissionLevel, number> = {
	read_only: 0,
	family_member: 1,
	current_user: 2,
	admin: 3,
}

export function resolveToolRole(input: {
	isAccountOwner: boolean
	familyMemberId: string | null
	requestedMemberId: string | null
}): ToolPermissionLevel {
	if (input.isAccountOwner) {
		return 'admin'
	}

	if (
		input.requestedMemberId &&
		input.familyMemberId &&
		input.requestedMemberId === input.familyMemberId
	) {
		return 'current_user'
	}

	if (input.requestedMemberId) {
		return 'family_member'
	}

	return 'read_only'
}

export function assertToolPermission(
	tool: ChronicleTool,
	context: ToolContext,
): void {
	const required = tool.permissions
	const callerRole = context.role

	const callerLevel = ROLE_HIERARCHY[callerRole] ?? 0
	const minRequired = Math.min(
		...required.map((permission) => ROLE_HIERARCHY[permission] ?? 0),
	)

	if (callerLevel < minRequired) {
		throw new ToolError(
			`Permission denied for tool "${tool.name}". Role "${callerRole}" cannot invoke tools requiring [${required.join(', ')}].`,
			'permission_denied',
		)
	}

	if (
		context.role === 'family_member' &&
		context.familyMemberId &&
		context.knowledge.familyMember.id &&
		context.familyMemberId !== context.knowledge.familyMember.id
	) {
		throw new ToolError(
			`Permission denied: family member cannot access another member's health data.`,
			'permission_denied',
		)
	}
}

export function createToolContext(input: {
	userId: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
	memberName?: string | null
	question: string
	intent: ToolContext['intent']
	knowledge: ToolContext['knowledge']
	metricIds?: string[]
	metricNames?: string[]
	timeRangeYears?: number
	categoryId?: string
	reportId?: string
	reportIds?: string[]
	signal?: AbortSignal
}): ToolContext {
	const isAccountOwner =
		input.knowledge.familyMember.isAccountOwner ||
		input.accountOwnerMemberId === input.familyMemberId

	return {
		userId: input.userId,
		familyMemberId: input.familyMemberId ?? null,
		accountOwnerMemberId: input.accountOwnerMemberId ?? null,
		memberName: input.memberName ?? null,
		role: resolveToolRole({
			isAccountOwner,
			familyMemberId: input.familyMemberId ?? null,
			requestedMemberId: input.knowledge.familyMember.id,
		}),
		domain: 'health',
		question: input.question,
		intent: input.intent,
		metricIds: input.metricIds,
		metricNames: input.metricNames,
		timeRangeYears: input.timeRangeYears,
		categoryId: input.categoryId,
		reportId: input.reportId,
		reportIds: input.reportIds,
		knowledge: input.knowledge,
		signal: input.signal,
	}
}
