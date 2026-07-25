import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { FamilyMemberSwitcher } from '@/features/family/components/FamilyMemberSwitcher'
import { TimelineFeed } from '@/features/timeline/components/TimelineFilters'

export function TimelinePage() {
	const navigate = useNavigate()

	return (
		<div style={{ padding: '18px 18px 24px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.home)}
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
				Home
			</button>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 12,
					marginBottom: 8,
				}}
			>
				<div
					style={{
						fontSize: 34,
						fontWeight: 800,
						letterSpacing: '-0.03em',
					}}
				>
					Life Timeline
				</div>
				<FamilyMemberSwitcher />
			</div>

			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 20,
					lineHeight: 1.5,
				}}
			>
				One chronological story across health, documents, and everything
				Chronicle learns about your family.
			</div>

			<TimelineFeed />
		</div>
	)
}
