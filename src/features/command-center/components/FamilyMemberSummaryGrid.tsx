import { useNavigate } from 'react-router-dom'
import { ChevronRight, Sparkles } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES, familyMemberPath } from '@/constants/routes'
import { MemberAvatar } from '@/features/family/components/MemberAvatar'
import type { FamilyMemberSummary } from '@/features/command-center/types/command-center.types'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'
import { COMMAND_CENTER_COPY } from '@/constants/product-copy'

interface FamilyMemberSummaryCardProps {
	summary: FamilyMemberSummary
	onAsk: (memberId: string) => void
}

function FamilyMemberSummaryCard({
	summary,
	onAsk,
}: FamilyMemberSummaryCardProps) {
	const navigate = useNavigate()
	const statusColor =
		summary.healthStatus === 'Needs attention'
			? C.orange
			: summary.healthReportCount > 0
				? C.teal
				: C.textMuted

	return (
		<div
			style={{
				padding: '14px 16px',
				borderRadius: 16,
				background: C.card,
				border: `1px solid ${C.border}`,
			}}
		>
			<button
				type="button"
				onClick={() => navigate(familyMemberPath(summary.memberId))}
				style={{
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					gap: 12,
					background: 'transparent',
					border: 'none',
					padding: 0,
					marginBottom: 12,
					cursor: 'pointer',
					textAlign: 'left',
					fontFamily: 'inherit',
				}}
			>
				<MemberAvatar
					name={summary.displayName}
					avatarUrl={summary.avatarUrl}
				/>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
						{summary.displayName}
					</div>
					<div style={{ fontSize: 12, color: C.textMuted }}>
						{summary.relationship}
					</div>
				</div>
				<ChevronRight size={16} color={C.textMuted} />
			</button>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
					gap: 8,
					marginBottom: 10,
				}}
			>
				<StatPill
					label="Health"
					value={summary.healthStatus}
					color={statusColor}
				/>
				<StatPill
					label="Documents"
					value={
						summary.documentCount > 0
							? `${summary.documentCount} saved`
							: 'None yet'
					}
					color={summary.documentCount > 0 ? C.accent : C.textMuted}
				/>
			</div>

			{summary.recentActivity ? (
				<div
					style={{
						fontSize: 12,
						color: C.textSec,
						marginBottom: 10,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{summary.recentActivity}
				</div>
			) : null}

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 8,
				}}
			>
				<div style={{ fontSize: 11, color: C.textMuted }}>
					Updated {summary.lastUpdatedLabel}
				</div>
				<button
					type="button"
					onClick={() => onAsk(summary.memberId)}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 4,
						background: `${C.accent}14`,
						color: C.accent,
						border: 'none',
						borderRadius: 100,
						padding: '6px 10px',
						fontSize: 11,
						fontWeight: 700,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					<Sparkles size={12} />
					Ask
				</button>
			</div>
		</div>
	)
}

function StatPill({
	label,
	value,
	color,
}: {
	label: string
	value: string
	color: string
}) {
	return (
		<div
			style={{
				padding: '8px 10px',
				borderRadius: 12,
				background: C.card2,
			}}
		>
			<div
				style={{
					fontSize: 10,
					fontWeight: 700,
					textTransform: 'uppercase',
					letterSpacing: '0.05em',
					color: C.textMuted,
					marginBottom: 3,
				}}
			>
				{label}
			</div>
			<div style={{ fontSize: 12, fontWeight: 600, color }}>{value}</div>
		</div>
	)
}

interface FamilyMemberSummaryGridProps {
	summaries: FamilyMemberSummary[]
	isLoading?: boolean
}

export function FamilyMemberSummaryGrid({
	summaries,
	isLoading = false,
}: FamilyMemberSummaryGridProps) {
	const navigate = useNavigate()

	if (isLoading) {
		return (
			<section style={{ marginBottom: 24 }}>
				<HomeSectionLabel>{COMMAND_CENTER_COPY.familyLabel}</HomeSectionLabel>
				<div style={{ display: 'grid', gap: 10 }}>
					{[0, 1].map((key) => (
						<div
							key={key}
							style={{
								height: 148,
								borderRadius: 16,
								background: C.card,
								border: `1px solid ${C.border}`,
								opacity: 0.55,
							}}
						/>
					))}
				</div>
			</section>
		)
	}

	if (summaries.length === 0) {
		return (
			<section style={{ marginBottom: 24 }}>
				<HomeSectionLabel>{COMMAND_CENTER_COPY.familyLabel}</HomeSectionLabel>
				<div
					style={{
						padding: '20px 16px',
						borderRadius: 16,
						border: `1px dashed ${C.border}`,
						color: C.textMuted,
						fontSize: 13,
					}}
				>
					Add family members to organize health and documents by person.
				</div>
			</section>
		)
	}

	return (
		<section style={{ marginBottom: 24 }}>
			<HomeSectionLabel>{COMMAND_CENTER_COPY.familyLabel}</HomeSectionLabel>
			<div style={{ display: 'grid', gap: 10 }}>
				{summaries.map((summary) => (
					<FamilyMemberSummaryCard
						key={summary.memberId}
						summary={summary}
						onAsk={() =>
							navigate(ROUTES.ask, {
								state: { memberId: summary.memberId },
							})
						}
					/>
				))}
			</div>
		</section>
	)
}
