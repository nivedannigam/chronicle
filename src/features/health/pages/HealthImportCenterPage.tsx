import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { useImportCenterView } from '@/features/health-import/hooks/useImportCenterView'
import { AI_REPROCESS_CONFIRMATION } from '@/features/health/services/health-ai-extraction.service'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { FigmaImportCenterView } from '@/ui/figma/health/FigmaImportCenterView'
import { HealthConfirmSheet } from '@/ui/figma/health/HealthConfirmSheet'
import { USER_VOCAB } from '@/constants/user-vocabulary'
import { ROUTES } from '@/constants/routes'
import { FC } from '@/ui/figma/v2/atoms'

export function HealthImportCenterPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMember } = useFamilyContext()
	const center = useImportCenterView(userId)
	const [advancedReadingTarget, setAdvancedReadingTarget] = useState<{
		reportId: string
		itemId: string
	} | null>(null)

	if (!userId) {
		return (
			<DashboardEmptyState
				title="Sign in to view import activity"
				message="Connect Google Drive and Chronicle will organize your records quietly in the background."
				emoji="🔐"
			/>
		)
	}

	if (!selectedMember) {
		return (
			<DashboardEmptyState
				title="Choose a family member"
				message="Select who you are managing health records for."
				emoji="👨‍👩‍👧"
				actionLabel="Go to Family"
				onAction={() => navigate(ROUTES.profileFamily)}
			/>
		)
	}

	if (center.isLoading) {
		return <ListSkeleton rows={4} />
	}

	if (!center.view.hasAnything) {
		return (
			<DashboardEmptyState
				title="All caught up"
				message="Chronicle is organizing your health records in the background. You'll only hear from us when something needs you."
				emoji="✨"
			/>
		)
	}

	return (
		<>
			<div style={{ padding: '0 22px 8px' }}>
				<h1
					style={{
						color: FC.fg,
						fontSize: 28,
						fontWeight: 800,
						letterSpacing: -1,
						margin: '0 0 6px',
					}}
				>
					Review documents
				</h1>
				<p style={{ color: FC.mid, fontSize: 14, margin: 0 }}>
					{USER_VOCAB.sections.needsAttention}
				</p>
			</div>
			<div style={{ padding: '0 22px' }}>
				<FigmaImportCenterView
					view={center.view}
					busyItemId={center.busyItemId}
					onKeep={(registryId) => void center.handleKeep(registryId)}
					onIgnore={(registryId) => void center.handleIgnore(registryId)}
					onChooseMember={(registryId, memberId) =>
						void center.handleChooseMember(registryId, memberId)
					}
					onTryAgain={(input) => void center.handleTryAgain(input)}
					onReprocessWithAi={(input) => setAdvancedReadingTarget(input)}
					onMove={center.handleMove}
				/>
				<HealthConfirmSheet
					isOpen={advancedReadingTarget != null}
					title={USER_VOCAB.actions.advancedReading}
					message={AI_REPROCESS_CONFIRMATION}
					confirmLabel={USER_VOCAB.actions.advancedReading}
					onConfirm={() => {
						if (!advancedReadingTarget) {
							return
						}

						void center
							.handleReprocessWithAi(advancedReadingTarget)
							.finally(() => setAdvancedReadingTarget(null))
					}}
					onCancel={() => setAdvancedReadingTarget(null)}
					isBusy={center.busyItemId === advancedReadingTarget?.itemId}
				/>
			</div>
		</>
	)
}
