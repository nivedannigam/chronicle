import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { useOsNotifications } from '@/features/os/hooks/useOsNotifications'
import { FigmaScreenHeader } from '@/ui/figma/shell/FigmaScreenHeader'
import { FC, figmaCardStyle } from '@/ui/figma/tokens/figma-v2-tokens'
import type { PlatformNotificationSeverity } from '@/core/platform/contracts/notification-platform.contract'

function severityColor(severity: PlatformNotificationSeverity): string {
	switch (severity) {
		case 'critical':
			return FC.red
		case 'warning':
			return FC.amber
		default:
			return FC.blue
	}
}

function moduleEmoji(moduleId: string): string {
	switch (moduleId) {
		case 'health':
			return '❤️'
		case 'insurance':
			return '🛡️'
		case 'documents':
			return '📄'
		default:
			return '🔔'
	}
}

export function FigmaNotificationsScreen() {
	const navigate = useNavigate()
	const { notifications, isLoading } = useOsNotifications()

	return (
		<div
			style={{
				flex: 1,
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
				minHeight: 0,
			}}
		>
			<FigmaScreenHeader
				title="Notifications"
				subtitle="Everything that needs your attention"
				onBack={() => navigate(ROUTES.home)}
				backLabel="Home"
			/>

			<div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 24px' }}>
				{isLoading ? <ListSkeleton rows={4} /> : null}

				{!isLoading && notifications.length === 0 ? (
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 22,
							padding: '32px 24px',
							textAlign: 'center',
						}}
					>
						<p style={{ fontSize: 32, margin: '0 0 12px' }}>✓</p>
						<p
							style={{
								color: FC.fg,
								fontSize: 16,
								fontWeight: 600,
								margin: '0 0 6px',
							}}
						>
							All clear
						</p>
						<p style={{ color: FC.dim, fontSize: 14, margin: 0 }}>
							No renewals, reminders, or alerts right now.
						</p>
					</div>
				) : null}

				{!isLoading && notifications.length > 0 ? (
					<div
						style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}
					>
						{notifications.map((notification, index) => {
							const color = severityColor(notification.severity)
							return (
								<button
									key={notification.id}
									type="button"
									onClick={() => {
										if (notification.actionPath) {
											navigate(notification.actionPath)
										}
									}}
									style={{
										width: '100%',
										display: 'flex',
										alignItems: 'flex-start',
										gap: 14,
										padding: '16px 18px',
										background: 'none',
										border: 'none',
										borderBottom:
											index < notifications.length - 1
												? '1px solid rgba(255,255,255,0.05)'
												: 'none',
										cursor: notification.actionPath ? 'pointer' : 'default',
										textAlign: 'left',
										fontFamily: 'inherit',
									}}
								>
									<span style={{ fontSize: 20, flexShrink: 0 }}>
										{moduleEmoji(notification.moduleId)}
									</span>
									<div style={{ flex: 1, minWidth: 0 }}>
										<p
											style={{
												color: FC.fg,
												fontSize: 14,
												fontWeight: 500,
												margin: '0 0 4px',
											}}
										>
											{notification.title}
										</p>
										<p
											style={{
												color: FC.dim,
												fontSize: 13,
												margin: 0,
												lineHeight: 1.45,
											}}
										>
											{notification.body}
										</p>
									</div>
									<div
										style={{
											width: 8,
											height: 8,
											borderRadius: 4,
											background: color,
											flexShrink: 0,
											marginTop: 6,
											boxShadow: `0 0 8px ${color}60`,
										}}
									/>
								</button>
							)
						})}
					</div>
				) : null}
			</div>
		</div>
	)
}
