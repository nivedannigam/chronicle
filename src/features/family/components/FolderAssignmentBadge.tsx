import { Check } from 'lucide-react'
import { C } from '@/constants/colors'
import {
	formatMemberLabel,
	getShortAssignmentLabel,
} from '@/features/family/services/folder-match.service'
import type { HealthSourceAssignment } from '@/features/family/types/family.types'

interface FolderAssignmentBadgeProps {
	assignments: HealthSourceAssignment[]
	compact?: boolean
}

export function FolderAssignmentBadge({
	assignments,
	compact = false,
}: FolderAssignmentBadgeProps) {
	if (assignments.length === 0) {
		return null
	}

	const memberNames = assignments.map((assignment) => assignment.memberLabel)
	const isShared = assignments.length > 1

	if (compact) {
		return (
			<div
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 4,
					fontSize: 11,
					fontWeight: 600,
					color: C.greenAlt,
				}}
			>
				<Check size={12} />
				{getShortAssignmentLabel(memberNames)}
			</div>
		)
	}

	if (isShared) {
		return (
			<div style={{ fontSize: 11, color: C.greenAlt, lineHeight: 1.5 }}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 4,
						fontWeight: 700,
					}}
				>
					<Check size={12} />
					Assigned to
				</div>
				{memberNames.map((name) => (
					<div key={name} style={{ paddingLeft: 16 }}>
						• {name}
					</div>
				))}
			</div>
		)
	}

	return (
		<div
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 4,
				fontSize: 11,
				fontWeight: 600,
				color: C.greenAlt,
			}}
		>
			<Check size={12} />
			Assigned to {memberNames[0]}
		</div>
	)
}

export function getFolderAssignmentsByExternalId(
	assignments: HealthSourceAssignment[],
	externalFolderId: string,
) {
	return assignments.filter(
		(assignment) => assignment.externalFolderId === externalFolderId,
	)
}

export { formatMemberLabel }
