import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { C } from '@/constants/colors'
import { useAuth } from '@/features/auth'
import { useUser } from '@/features/user/hooks/useUser'

export function SettingsAccountPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { profile } = useUser()

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
				}}
			>
				<Row label="Name" value={profile?.name ?? '—'} />
				<Row label="Email" value={user?.email ?? '—'} />
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
			<div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
				{value}
			</div>
		</div>
	)
}
