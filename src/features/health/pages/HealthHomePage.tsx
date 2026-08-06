import { useNavigate } from 'react-router-dom'
import { HealthImportAttentionBanner } from '@/features/health/components/HealthImportAttentionBanner'
import {
	DashboardEmptyState,
	DashboardSkeleton,
} from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthContext } from '@/features/health/context/HealthContext'
import { useImportAttentionSummary } from '@/features/health-import/hooks/useImportAttentionSummary'
import { useAuth } from '@/features/auth'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { FigmaHealthHomeView } from '@/ui/figma/health/FigmaHealthHomeView'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function HealthHomePage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { story, hasImportedReports, isLoading, isError, refetch } =
		useHealthContext()
	const importAttention = useImportAttentionSummary(user?.id)

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
		<>
			{importAttention.message ? (
				<HealthImportAttentionBanner message={importAttention.message} />
			) : null}
			<FigmaHealthHomeView story={story} />
		</>
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
				{HEALTH_COPY.emptyStoryTitle}
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
				{HEALTH_COPY.emptyStoryBody}
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
