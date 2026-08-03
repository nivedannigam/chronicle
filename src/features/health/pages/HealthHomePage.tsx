import { useNavigate } from 'react-router-dom'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { resolveMemberDisplayName } from '@/features/family/utils/member-display'
import { useAuth } from '@/features/auth'
import {
	DashboardEmptyState,
	DashboardSkeleton,
} from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { FigmaHealthHomeView } from '@/ui/figma/health/FigmaHealthHomeView'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function HealthHomePage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { selectedMember } = useFamilyContext()
	const { companion, hasImportedReports, isLoading, isError, refetch } =
		useHealthCompanion()

	const memberName = resolveMemberDisplayName({
		profileName:
			(typeof user?.user_metadata?.full_name === 'string'
				? user.user_metadata.full_name
				: null) ??
			(typeof user?.user_metadata?.name === 'string'
				? user.user_metadata.name
				: null),
		memberDisplayName: selectedMember?.displayName,
		isAccountOwner: selectedMember?.isAccountOwner,
	})

	if (isLoading) {
		return <DashboardSkeleton />
	}

	if (isError) {
		return (
			<DashboardEmptyState
				title="Could not load health data"
				message="Check your connection and try again."
				emoji="⚠️"
				actionLabel="Try again"
				onAction={() => void refetch()}
			/>
		)
	}

	if (!hasImportedReports) {
		return (
			<HealthStoryEmptyState
				onConnectDrive={() => navigate(ROUTES.profileConnectionsDrive)}
				onChooseFolder={() => navigate(ROUTES.healthFolderSetup)}
			/>
		)
	}

	return (
		<FigmaHealthHomeView
			companion={companion}
			memberName={memberName}
			hasReports={hasImportedReports}
		/>
	)
}

function HealthStoryEmptyState({
	onConnectDrive,
	onChooseFolder,
}: {
	onConnectDrive: () => void
	onChooseFolder: () => void
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				textAlign: 'center',
				padding: '48px 12px 32px',
			}}
		>
			<div style={{ fontSize: 48, marginBottom: 16 }}>💚</div>
			<h2
				style={{
					color: FC.fg,
					fontSize: 22,
					fontWeight: 700,
					margin: '0 0 10px',
					letterSpacing: -0.4,
				}}
			>
				{HEALTH_COPY.emptyTitle}
			</h2>
			<p
				style={{
					color: FC.mid,
					fontSize: 14,
					lineHeight: 1.55,
					margin: '0 0 24px',
					maxWidth: 320,
				}}
			>
				{HEALTH_COPY.emptyBody}
			</p>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 10,
					width: '100%',
					maxWidth: 280,
				}}
			>
				<button
					type="button"
					onClick={onConnectDrive}
					style={{
						background: FC.blue,
						border: 'none',
						borderRadius: 14,
						padding: '13px 18px',
						color: '#fff',
						fontSize: 14,
						fontWeight: 700,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					{HEALTH_COPY.connectDrive}
				</button>
				<button
					type="button"
					onClick={onChooseFolder}
					style={{
						...figmaCardStyle,
						borderRadius: 14,
						padding: '13px 18px',
						color: FC.fg,
						fontSize: 14,
						fontWeight: 600,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					{HEALTH_COPY.chooseFolder}
				</button>
			</div>
		</div>
	)
}

/** @deprecated Use HealthHomePage */
export const HealthDashboardPage = HealthHomePage
