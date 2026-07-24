import { useState } from 'react'
import { C } from '@/constants/colors'
import {
	FAMILY_ROLES,
	GENDER_OPTIONS,
	MEMBER_STATUS_OPTIONS,
	RELATIONSHIP_OPTIONS,
} from '@/features/family/constants/family-roles'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type {
	FamilyMemberStatus,
	FamilyRoleId,
} from '@/types/database/family-foundation.types'

export interface FamilyMemberFormValues {
	displayName: string
	relationship: string
	roleId: FamilyRoleId
	dateOfBirth: string
	gender: string
	status: FamilyMemberStatus
	aliases: string
}

interface FamilyMemberFormProps {
	initial?: Partial<FamilyMemberWithAliases>
	onSubmit: (values: FamilyMemberFormValues) => Promise<void>
	submitLabel: string
	disableOwnerRole?: boolean
}

const inputStyle = {
	width: '100%',
	background: C.card2,
	border: `1px solid ${C.border}`,
	borderRadius: 12,
	padding: '12px 14px',
	fontSize: 14,
	color: C.text,
	fontFamily: 'inherit',
} as const

const labelStyle = {
	display: 'block',
	fontSize: 12,
	fontWeight: 600,
	color: C.textMuted,
	marginBottom: 6,
} as const

export function FamilyMemberForm({
	initial,
	onSubmit,
	submitLabel,
	disableOwnerRole = false,
}: FamilyMemberFormProps) {
	const [values, setValues] = useState<FamilyMemberFormValues>({
		displayName: initial?.displayName ?? '',
		relationship: initial?.relationship ?? 'other',
		roleId: initial?.roleId ?? 'adult',
		dateOfBirth: initial?.dateOfBirth ?? '',
		gender: initial?.gender ?? '',
		status: initial?.status ?? 'active',
		aliases: initial?.aliases?.join(', ') ?? '',
	})
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		setError(null)
		setIsSubmitting(true)

		try {
			await onSubmit(values)
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Could not save member.',
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
			<label>
				<span style={labelStyle}>Name</span>
				<input
					required
					value={values.displayName}
					onChange={(event) =>
						setValues((current) => ({
							...current,
							displayName: event.target.value,
						}))
					}
					style={inputStyle}
					placeholder="Full name"
				/>
			</label>

			<label>
				<span style={labelStyle}>Relationship</span>
				<select
					value={values.relationship}
					onChange={(event) =>
						setValues((current) => ({
							...current,
							relationship: event.target.value,
						}))
					}
					style={inputStyle}
				>
					{RELATIONSHIP_OPTIONS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</label>

			<label>
				<span style={labelStyle}>Role</span>
				<select
					value={values.roleId}
					onChange={(event) =>
						setValues((current) => ({
							...current,
							roleId: event.target.value as FamilyRoleId,
						}))
					}
					style={inputStyle}
					disabled={disableOwnerRole && initial?.roleId === 'owner'}
				>
					{FAMILY_ROLES.filter(
						(role) => !(disableOwnerRole && role.id === 'owner'),
					).map((role) => (
						<option key={role.id} value={role.id}>
							{role.label}
						</option>
					))}
				</select>
			</label>

			<label>
				<span style={labelStyle}>Date of birth</span>
				<input
					type="date"
					value={values.dateOfBirth}
					onChange={(event) =>
						setValues((current) => ({
							...current,
							dateOfBirth: event.target.value,
						}))
					}
					style={inputStyle}
				/>
			</label>

			<label>
				<span style={labelStyle}>Gender</span>
				<select
					value={values.gender}
					onChange={(event) =>
						setValues((current) => ({ ...current, gender: event.target.value }))
					}
					style={inputStyle}
				>
					<option value="">Not specified</option>
					{GENDER_OPTIONS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</label>

			<label>
				<span style={labelStyle}>Status</span>
				<select
					value={values.status}
					onChange={(event) =>
						setValues((current) => ({
							...current,
							status: event.target.value as FamilyMemberStatus,
						}))
					}
					style={inputStyle}
					disabled={initial?.isAccountOwner}
				>
					{MEMBER_STATUS_OPTIONS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</label>

			<label>
				<span style={labelStyle}>Health aliases (comma separated)</span>
				<input
					value={values.aliases}
					onChange={(event) =>
						setValues((current) => ({
							...current,
							aliases: event.target.value,
						}))
					}
					style={inputStyle}
					placeholder="e.g. Nivedan, Niv"
				/>
			</label>

			{error ? (
				<p style={{ fontSize: 13, color: C.red, margin: 0 }}>{error}</p>
			) : null}

			<button
				type="submit"
				disabled={isSubmitting}
				style={{
					background: C.accent,
					color: C.white,
					border: 'none',
					borderRadius: 100,
					padding: '12px 18px',
					fontSize: 14,
					fontWeight: 700,
					cursor: isSubmitting ? 'not-allowed' : 'pointer',
					fontFamily: 'inherit',
					opacity: isSubmitting ? 0.7 : 1,
				}}
			>
				{isSubmitting ? 'Saving...' : submitLabel}
			</button>
		</form>
	)
}
