import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { C } from '@/constants/colors'
import { useAuth } from '@/features/auth'
import { useUser } from '@/features/user/hooks/useUser'
import { supabase } from '@/lib/supabase'

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
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(-1)}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: 0,
					marginBottom: 16,
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				Back
			</button>

			<div style={{ fontSize: 28, fontWeight: 800, marginBottom: 18 }}>
				Account
			</div>

			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 16,
					padding: 16,
					marginBottom: 12,
				}}
			>
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

				<button
					type="button"
					onClick={() => void handleSave()}
					disabled={isSaving}
					style={{
						width: '100%',
						padding: '12px 16px',
						borderRadius: 12,
						border: 'none',
						background: C.accent,
						color: C.white,
						fontSize: 14,
						fontWeight: 700,
						cursor: isSaving ? 'wait' : 'pointer',
						fontFamily: 'inherit',
						opacity: isSaving ? 0.7 : 1,
					}}
				>
					{isSaving ? 'Saving…' : 'Save changes'}
				</button>

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
			</div>
		</div>
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
