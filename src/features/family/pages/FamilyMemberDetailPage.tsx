import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { C } from '@/constants/colors'
import { familyMemberEditPath, ROUTES } from '@/constants/routes'
import { FUTURE_MODULE_PLACEHOLDERS } from '@/features/family/constants/family-roles'
import { MemberAvatar } from '@/features/family/components/MemberAvatar'
import { MemberRoleBadge } from '@/features/family/components/MemberRoleBadge'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { getFamilyMemberById } from '@/features/family/services/family.service'
import { formatDateOfBirth } from '@/features/family/utils/member-display'
import { STALE_TIME } from '@/lib/query-keys'

export function FamilyMemberDetailPage() {
	const navigate = useNavigate()
	const { memberId = '' } = useParams()
	const { setSelectedMemberId } = useFamilyContext()

	const memberQuery = useQuery({
		queryKey: ['family-member-detail', memberId],
		queryFn: () => getFamilyMemberById(memberId),
		enabled: Boolean(memberId),
		staleTime: STALE_TIME.familyMembers,
	})

	const member = memberQuery.data

	if (memberQuery.isLoading) {
		return (
			<div style={{ padding: '18px', color: C.text }}>
				<div
					style={{
						height: 120,
						borderRadius: 18,
						background: C.card,
						border: `1px solid ${C.border}`,
						opacity: 0.6,
					}}
				/>
			</div>
		)
	}

	if (!member) {
		return (
			<div style={{ padding: '18px', color: C.text }}>
				<p>Member not found.</p>
				<button
					type="button"
					onClick={() => navigate(ROUTES.family)}
					style={{
						background: 'none',
						border: 'none',
						color: C.accent,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					Back to family
				</button>
			</div>
		)
	}

	return (
		<div style={{ padding: '18px 18px 24px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.family)}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: 0,
					marginBottom: 18,
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				Family
			</button>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 14,
					marginBottom: 22,
				}}
			>
				<MemberAvatar
					name={member.displayName}
					avatarUrl={member.avatarUrl}
					size={64}
				/>
				<div style={{ flex: 1 }}>
					<div
						style={{
							fontSize: 28,
							fontWeight: 800,
							letterSpacing: '-0.03em',
							marginBottom: 8,
						}}
					>
						{member.displayName}
					</div>
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
						<MemberRoleBadge roleId={member.roleId} />
						<span style={{ fontSize: 13, color: C.textMuted }}>
							{member.relationship}
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={() => navigate(familyMemberEditPath(member.id))}
					style={{
						width: 40,
						height: 40,
						borderRadius: '50%',
						border: `1px solid ${C.border}`,
						background: C.card,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						cursor: 'pointer',
					}}
				>
					<Pencil size={16} color={C.textSec} />
				</button>
			</div>

			<div
				style={{
					display: 'grid',
					gap: 12,
					marginBottom: 28,
				}}
			>
				{[
					['Date of birth', formatDateOfBirth(member.dateOfBirth) ?? '—'],
					['Gender', member.gender?.replaceAll('_', ' ') ?? '—'],
					['Status', member.status],
					[
						'Health aliases',
						member.aliases.length > 0 ? member.aliases.join(', ') : '—',
					],
				].map(([label, value]) => (
					<div
						key={label}
						style={{
							padding: '14px 16px',
							borderRadius: 14,
							background: C.card,
							border: `1px solid ${C.border}`,
						}}
					>
						<div
							style={{
								fontSize: 11,
								fontWeight: 600,
								color: C.textMuted,
								marginBottom: 4,
								textTransform: 'uppercase',
								letterSpacing: '0.08em',
							}}
						>
							{label}
						</div>
						<div style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
					</div>
				))}
			</div>

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Modules
			</div>
			<div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
				{FUTURE_MODULE_PLACEHOLDERS.map((module) => (
					<div
						key={module.id}
						style={{
							padding: '14px 16px',
							borderRadius: 14,
							background: C.card,
							border: `1px solid ${C.border}`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
						}}
					>
						<span style={{ fontSize: 14, fontWeight: 600 }}>
							{module.label}
						</span>
						<span style={{ fontSize: 12, color: C.textMuted }}>
							{module.available ? 'Available' : 'Coming soon'}
						</span>
					</div>
				))}
			</div>

			<button
				type="button"
				onClick={() => setSelectedMemberId(member.id)}
				style={{
					width: '100%',
					background: C.accentDim,
					color: C.accent,
					border: `1px solid ${C.accent}44`,
					borderRadius: 100,
					padding: '12px 16px',
					fontSize: 14,
					fontWeight: 700,
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				Use as selected member
			</button>
		</div>
	)
}
