import { useNavigate } from 'react-router-dom'
import { CheckCircle2, FileInput, HardDrive, Users } from 'lucide-react'
import { C } from '@/constants/colors'
import { HOME_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'
import type { HomeActivityItem } from '@/features/home/types/home.types'

const KIND_ICONS = {
	import: FileInput,
	extraction: CheckCircle2,
	connection: HardDrive,
	review: CheckCircle2,
	family: Users,
} as const

function formatActivityTime(timestamp: string): string {
	const date = new Date(timestamp)
	const now = new Date()
	const isToday = date.toDateString() === now.toDateString()

	if (isToday) {
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
		})
	}

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
	})
}

interface HomeRecentActivityProps {
	activities: HomeActivityItem[]
	totalCount: number
	isLoading?: boolean
	title?: string
	showViewAll?: boolean
}

export function HomeRecentActivity({
	activities,
	totalCount,
	isLoading = false,
	title = HOME_COPY.activityLabel,
	showViewAll = true,
}: HomeRecentActivityProps) {
	const navigate = useNavigate()

	if (isLoading) {
		return (
			<section style={{ marginBottom: 28 }}>
				<HomeSectionLabel>Recent Activity</HomeSectionLabel>
				<div
					style={{
						height: 120,
						borderRadius: 18,
						background: C.card,
						border: `1px solid ${C.border}`,
						opacity: 0.55,
					}}
				/>
			</section>
		)
	}

	return (
		<section style={{ marginBottom: 28 }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 12,
				}}
			>
				<HomeSectionLabel>{title}</HomeSectionLabel>
				{showViewAll && totalCount > activities.length ? (
					<button
						type="button"
						onClick={() => navigate(ROUTES.homeActivity)}
						style={{
							background: 'none',
							border: 'none',
							padding: 0,
							fontSize: 12,
							fontWeight: 600,
							color: C.accent,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						View All
					</button>
				) : null}
			</div>

			{activities.length === 0 ? (
				<div
					style={{
						padding: '20px 16px',
						borderRadius: 16,
						border: `1px dashed ${C.border}`,
						background: C.card,
						fontSize: 13,
						color: C.textMuted,
						lineHeight: 1.55,
					}}
				>
					Activity from your timeline will appear here as you use Chronicle.
				</div>
			) : (
				<div
					style={{
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 18,
						overflow: 'hidden',
					}}
				>
					{activities.map((item, index) => {
						const Icon = KIND_ICONS[item.kind]

						return (
							<div
								key={item.id}
								style={{
									display: 'flex',
									alignItems: 'flex-start',
									gap: 12,
									padding: '14px 16px',
									borderBottom:
										index === activities.length - 1
											? 'none'
											: `1px solid ${C.border}`,
								}}
							>
								<div
									style={{
										width: 34,
										height: 34,
										borderRadius: 10,
										background: C.card2,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										flexShrink: 0,
									}}
								>
									<Icon size={16} color={C.textSec} />
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											display: 'flex',
											alignItems: 'baseline',
											justifyContent: 'space-between',
											gap: 8,
											marginBottom: 2,
										}}
									>
										<div style={{ fontSize: 14, fontWeight: 600 }}>
											{item.title}
										</div>
										<div
											style={{
												fontSize: 11,
												color: C.textMuted,
												flexShrink: 0,
											}}
										>
											{formatActivityTime(item.timestamp)}
										</div>
									</div>
									<div
										style={{
											fontSize: 12,
											color: C.textMuted,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
										}}
									>
										{item.subtitle}
									</div>
								</div>
							</div>
						)
					})}
				</div>
			)}
		</section>
	)
}
