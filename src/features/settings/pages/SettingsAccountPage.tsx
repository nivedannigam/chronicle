import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { useUser } from '@/features/user/hooks/useUser'
import { supabase } from '@/lib/supabase'
import { FigmaCard } from '@/ui/figma/components/primitives'
import {
	SettingsPageShell,
	SettingsPrimaryButton,
} from '@/ui/figma/settings/settings-ui'

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

	return (
		<SettingsPageShell
			backLabel="Profile"
			onBack={() => navigate(ROUTES.profile)}
			title="Account"
			subtitle="Name, email, and security"
		>
			<FigmaCard style={{ padding: 16 }}>
				<label style={{ display: 'block', marginBottom: 14 }}>
					<div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>
						Display name
					</div>
					<input
						value={name}
						onChange={(event) => setName(event.target.value)}
						style={{
							width: '100%',
							background: C.card2,
							border: `1px solid ${C.border}`,
							borderRadius: 12,
							padding: '12px 14px',
							fontSize: 15,
							fontWeight: 600,
							color: C.text,
							fontFamily: 'inherit',
						}}
					/>
				</label>

				<Row label="Email" value={user?.email ?? '—'} />

				{error ? (
					<div style={{ fontSize: 13, color: C.red, marginBottom: 10 }}>
						{error}
					</div>
				) : null}

				<SettingsPrimaryButton
					onClick={() => void handleSave()}
					disabled={isSaving}
				>
					{isSaving ? (
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 8,
							}}
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
							color: C.greenAlt,
						}}
					>
						<Check size={16} />
						Saved successfully
					</div>
				) : null}
			</FigmaCard>
		</SettingsPageShell>
	)
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div style={{ marginBottom: 12 }}>
			<div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
				{label}
			</div>
			<div style={{ fontSize: 15, fontWeight: 600, color: C.textSec }}>
				{value}
			</div>
		</div>
	)
}
