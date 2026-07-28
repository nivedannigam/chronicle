import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { FamilyMemberSwitcher } from '@/features/family/components/FamilyMemberSwitcher'
import { TimelineFeed } from '@/features/timeline/components/TimelineFilters'
import {
	FigmaHeaderSearchButton,
	FigmaScreenHeader,
} from '@/ui/figma/shell/FigmaScreenHeader'

export function TimelinePage() {
	const navigate = useNavigate()

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				minHeight: 0,
				flex: 1,
			}}
		>
			<FigmaScreenHeader
				title="Timeline"
				subtitle="One story across health, documents, and family life"
				actions={
					<FigmaHeaderSearchButton onClick={() => navigate(ROUTES.search)} />
				}
			/>

			<div
				style={{
					padding: '0 22px 12px',
					flexShrink: 0,
				}}
			>
				<FamilyMemberSwitcher />
			</div>

			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					padding: '0 22px 24px',
					scrollbarWidth: 'none',
				}}
			>
				<TimelineFeed />
			</div>
		</div>
	)
}
