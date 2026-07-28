import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Cloud } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { DriveBrowser } from '@/features/connectors/google-drive/components/DriveBrowser'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { logConnectorRequest } from '@/features/connectors/services/connector-request-logger'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, FigmaIconBox, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function HealthFolderSetupPage() {
	const navigate = useNavigate()
	const { user, session } = useAuth()
	const userId = user?.id
	const { selectedMember } = useFamilyContext()
	const { connectionStatus, finalizeOAuthReturn } =
		useGoogleDriveConnector(userId)
	const lastFinalizedTokenRef = useRef<string | null>(null)

	useEffect(() => {
		const providerToken = session?.provider_token

		if (!userId || !providerToken) {
			return
		}

		if (lastFinalizedTokenRef.current === providerToken) {
			return
		}

		lastFinalizedTokenRef.current = providerToken
		logConnectorRequest(
			'HealthFolderSetupPage',
			'drive-connector',
			'OAuth return finalize',
		)

		void finalizeOAuthReturn({
			provider_token: providerToken,
			provider_refresh_token: session.provider_refresh_token,
		})
	}, [
		userId,
		session?.provider_token,
		session?.provider_refresh_token,
		finalizeOAuthReturn,
	])

	if (!userId) {
		return (
			<DashboardEmptyState
				title="Sign in to assign folders"
				message="Connect Google Drive and choose health folders once you are signed in."
				emoji="🔐"
			/>
		)
	}

	if (!selectedMember) {
		return (
			<DashboardEmptyState
				title="Choose a family member"
				message="Select who you are assigning a health folder for."
				emoji="👨‍👩‍👧"
				actionLabel="Go to Family"
				onAction={() => navigate(ROUTES.profileFamily)}
			/>
		)
	}

	const memberLabel = formatMemberLabel(selectedMember)
	const isConnected = connectionStatus === 'connected'

	return (
		<div>
			<button
				type="button"
				onClick={() => navigate(ROUTES.healthSettings)}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: 0,
					marginBottom: 16,
					cursor: 'pointer',
					color: FC.mid,
					fontFamily: 'inherit',
					fontSize: 13,
					fontWeight: 600,
				}}
			>
				<ArrowLeft size={16} />
				Back to setup
			</button>

			<div style={{ marginBottom: 8 }}>
				<FigmaHealthSectionLabel>Health folder</FigmaHealthSectionLabel>
			</div>
			<h2
				style={{
					color: FC.fg,
					fontSize: 22,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					margin: '0 0 8px',
				}}
			>
				Assign folder for {memberLabel}
			</h2>
			<p
				style={{
					color: FC.mid,
					fontSize: 13.5,
					lineHeight: 1.5,
					margin: '0 0 20px',
				}}
			>
				Browse Google Drive and choose the folder where this person&apos;s
				medical reports are stored. Repeat for each family member with a
				different folder.
			</p>

			{isConnected ? (
				<DriveBrowser userId={userId} />
			) : (
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 20,
						padding: '18px',
						marginBottom: 20,
					}}
				>
					<div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
						<FigmaIconBox color={FC.amber} size={42}>
							<Cloud size={18} color={FC.amber} strokeWidth={1.8} />
						</FigmaIconBox>
						<div style={{ flex: 1 }}>
							<p
								style={{
									color: FC.fg,
									fontSize: 14.5,
									fontWeight: 600,
									margin: '0 0 6px',
								}}
							>
								Connect Google Drive first
							</p>
							<p
								style={{
									color: FC.mid,
									fontSize: 13,
									lineHeight: 1.5,
									margin: '0 0 14px',
								}}
							>
								Chronicle needs read-only access to browse your Drive folders.
							</p>
							<button
								type="button"
								onClick={() => navigate(ROUTES.profileConnectionsDrive)}
								style={{
									background: FC.blue,
									color: '#fff',
									border: 'none',
									borderRadius: 12,
									padding: '8px 14px',
									cursor: 'pointer',
									fontFamily: 'inherit',
									fontWeight: 600,
									fontSize: 13,
								}}
							>
								Connect Google Drive
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
