import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'

interface HealthPageHeaderProps {
	title: string
	subtitle?: string
	backTo?: string
}

export function HealthPageHeader({
	title,
	subtitle,
	backTo = ROUTES.more,
}: HealthPageHeaderProps) {
	const navigate = useNavigate()

	return (
		<div style={{ marginBottom: 22 }}>
			<button
				type="button"
				onClick={() => navigate(backTo)}
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
			<div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}>
				{title}
			</div>
			{subtitle ? (
				<div style={{ fontSize: 14, color: C.textMuted, marginTop: 6 }}>
					{subtitle}
				</div>
			) : null}
		</div>
	)
}
