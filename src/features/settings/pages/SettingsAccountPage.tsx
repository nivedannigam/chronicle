import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { useUser } from '@/features/user/hooks/useUser'
import { supabase } from '@/lib/supabase'
import {
	ProfileAvatar,
	ProfilePageShell,
	ProfileSectionCard,
} from '@/ui/figma/profile/profile-ui'
import { FC } from '@/ui/figma/v2/atoms'
import { SettingsPrimaryButton } from '@/ui/figma/settings/settings-ui'

export function SettingsAccountPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { profile } = useUser()
	const savedName = profile?.name ?? ''
	const [name, setName] = useState(savedName)
	const [syncedName, setSyncedName] = useState(savedName)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [saved, setSaved] = useState(false)

	if (savedName !== syncedName && !isSaving) {
		setSyncedName(savedName)
		setName(savedName)
	}

	const handleSave = async () => {
		const trimmed = name.trim()

		if (!trimmed) {
			setError('Name is required.')
			return
		}

		setError(null)
		setIsSaving(true)
		setSaved(false)

		try {
			const { error: updateError } = await supabase.auth.updateUser({
				data: {
					...(user?.user_metadata ?? {}),
					full_name: trimmed,
				},
			})

			if (updateError) {
				throw updateError
			}

			setSaved(true)
			setSyncedName(trimmed)
			window.setTimeout(() => setSaved(false), 2500)
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: 'Could not save your name.',
			)
		} finally {
			setIsSaving(false)
		}
	}

	const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'You'

	return (
		<ProfilePageShell
			title="Personal"
			subtitle="Your identity and regional preferences"
			backLabel="Profile"
			onBack={() => navigate(ROUTES.profile)}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					padding: '8px 0 20px',
				}}
			>
				<ProfileAvatar
					name={displayName}
					avatarUrl={profile?.avatarUrl}
					size={72}
				/>
			</div>

			<ProfileSectionCard title="Identity">
				<div style={{ padding: '14px 18px' }}>
					<Field label="Display name">
						<input
							value={name}
							onChange={(event) => setName(event.target.value)}
							style={inputStyle}
						/>
					</Field>
					<Field label="Email">
						<ReadOnlyValue value={user?.email ?? '—'} />
					</Field>
					<Field label="Phone" isLast>
						<ComingSoonValue />
					</Field>
				</div>
			</ProfileSectionCard>

			<ProfileSectionCard title="Details">
				<div style={{ padding: '14px 18px' }}>
					<Field label="Date of birth">
						<ComingSoonValue />
					</Field>
					<Field label="Emergency contact" isLast>
						<ComingSoonValue />
					</Field>
				</div>
			</ProfileSectionCard>

			<ProfileSectionCard title="Regional">
				<div style={{ padding: '14px 18px' }}>
					<Field label="Preferred language">
						<ComingSoonValue detail="English (default)" />
					</Field>
					<Field label="Timezone" isLast>
						<ComingSoonValue
							detail={Intl.DateTimeFormat().resolvedOptions().timeZone}
						/>
					</Field>
				</div>
			</ProfileSectionCard>

			{error ? (
				<p style={{ color: FC.red, fontSize: 13, margin: '0 0 12px' }}>
					{error}
				</p>
			) : null}

			<SettingsPrimaryButton
				onClick={() => void handleSave()}
				disabled={isSaving}
			>
				{isSaving ? (
					<span
						style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
					>
						<Loader2
							size={16}
							style={{ animation: 'spin 1s linear infinite' }}
						/>
						Saving…
					</span>
				) : (
					'Save changes'
				)}
			</SettingsPrimaryButton>

			{saved ? (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 6,
						marginTop: 10,
						fontSize: 13,
						fontWeight: 600,
						color: FC.green,
					}}
				>
					<Check size={16} />
					Saved successfully
				</div>
			) : null}
		</ProfilePageShell>
	)
}

const inputStyle = {
	width: '100%',
	boxSizing: 'border-box' as const,
	background: FC.raise,
	border: `1px solid ${FC.line}`,
	borderRadius: 12,
	padding: '12px 14px',
	fontSize: 15,
	fontWeight: 600,
	color: FC.fg,
	fontFamily: 'inherit',
}

function Field({
	label,
	children,
	isLast = false,
}: {
	label: string
	children: ReactNode
	isLast?: boolean
}) {
	return (
		<label
			style={{
				display: 'block',
				marginBottom: isLast ? 0 : 14,
				paddingBottom: isLast ? 0 : 14,
				borderBottom: isLast ? 'none' : `1px solid ${FC.line}`,
			}}
		>
			<div
				style={{
					fontSize: 11,
					color: FC.dim,
					marginBottom: 6,
					fontWeight: 600,
					textTransform: 'uppercase',
					letterSpacing: '0.06em',
				}}
			>
				{label}
			</div>
			{children}
		</label>
	)
}

function ReadOnlyValue({ value }: { value: string }) {
	return (
		<div style={{ fontSize: 15, fontWeight: 600, color: FC.mid }}>{value}</div>
	)
}

function ComingSoonValue({ detail }: { detail?: string }) {
	return (
		<div>
			<div style={{ fontSize: 15, fontWeight: 600, color: FC.mid }}>
				{detail ?? 'Coming soon'}
			</div>
			{detail ? (
				<div style={{ fontSize: 11, color: FC.dim, marginTop: 4 }}>
					Editable in a future update
				</div>
			) : null}
		</div>
	)
}
