import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { HOME_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'
import { TimelineEventRow } from '@/features/timeline/components/TimelineEventRow'
import { useTimelinePreview } from '@/features/timeline/hooks/useTimelineEvents'

interface HomeLifeTimelineProps {
	isLoading?: boolean
}

export function HomeLifeTimeline({ isLoading = false }: HomeLifeTimelineProps) {
	const navigate = useNavigate()
	const previewEvents = useTimelinePreview(5)

	if (isLoading) {
		return (
			<section style={{ marginBottom: 28 }}>
				<HomeSectionLabel>{HOME_COPY.timelineLabel}</HomeSectionLabel>
				<div
					style={{
						height: 160,
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
				<HomeSectionLabel>{HOME_COPY.timelineLabel}</HomeSectionLabel>
				<button
					type="button"
					onClick={() => navigate(ROUTES.timeline)}
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
					{HOME_COPY.viewTimelineLabel}
				</button>
			</div>

			{previewEvents.length === 0 ? (
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
					Your life timeline will appear here as Chronicle learns from health
					reports, documents, and future capabilities.
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
					{previewEvents.map((event, index) => (
						<div
							key={event.id}
							style={{
								borderBottom:
									index === previewEvents.length - 1
										? 'none'
										: `1px solid ${C.border}`,
							}}
						>
							<TimelineEventRow event={event} showModule />
						</div>
					))}
				</div>
			)}
		</section>
	)
}
