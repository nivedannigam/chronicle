import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { C, screenTitleStyle } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { FamilyMemberSwitcher } from '@/features/family/components/FamilyMemberSwitcher'
import { TimelineFeed } from '@/features/timeline/components/TimelineFilters'
import { HealthPageIntro } from '@/ui/figma/health/health-ui'

export function TimelinePage() {
	const navigate = useNavigate()

	return (
		<div style={{ color: C.text, padding: '0 18px' }}>
			<div
				style={{
					position: 'sticky',
					top: 0,
					zIndex: 10,
					background: C.bg,
					paddingTop: 4,
					paddingBottom: 14,
					marginBottom: 4,
					borderBottom: `1px solid ${C.border}`,
				}}
			>
				<button
					type="button"
					onClick={() => navigate(ROUTES.more)}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 6,
						background: 'none',
						border: 'none',
						padding: '0 0 12px',
						cursor: 'pointer',
						color: C.textSec,
						fontFamily: 'inherit',
						fontSize: 14,
					}}
				>
					<ArrowLeft size={18} />
					Back
				</button>

				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 12,
					}}
				>
					<div style={{ ...screenTitleStyle, flex: 1, minWidth: 0 }}>
						Life Timeline
					</div>
					<FamilyMemberSwitcher />
				</div>
			</div>

			<div style={{ padding: '8px 0 20px' }}>
				<HealthPageIntro>
					One chronological story across health, documents, and everything
					Chronicle learns about your family.
				</HealthPageIntro>

				<TimelineFeed />
			</div>
		</div>
	)
}
