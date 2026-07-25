import { C, pagePadding } from '@/constants/colors'
import { AttentionCenter } from '@/features/command-center/components/AttentionCenter'
import { CommandCenterDocuments } from '@/features/command-center/components/CommandCenterDocuments'
import { CommandCenterInsights } from '@/features/command-center/components/CommandCenterInsights'
import { FamilyMemberSummaryGrid } from '@/features/command-center/components/FamilyMemberSummaryGrid'
import { QuickActionsBar } from '@/features/command-center/components/QuickActionsBar'
import { UnifiedSearchBar } from '@/features/command-center/components/UnifiedSearchBar'
import { useCommandCenter } from '@/features/command-center/hooks/useCommandCenter'
import type { CommandCenterWidgetDefinition } from '@/features/command-center/types/command-center.types'
import { HomeExploreChronicle } from '@/features/home/components/HomeExploreChronicle'
import { HomeGreeting } from '@/features/home/components/HomeGreeting'
import { HomePageSkeleton } from '@/features/home/components/HomePageSkeleton'
import { TimelineEventRow } from '@/features/timeline/components/TimelineEventRow'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'
import { COMMAND_CENTER_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { useNavigate } from 'react-router-dom'

function widgetIsVisible(
	widgets: CommandCenterWidgetDefinition[],
	id: string,
): boolean {
	return widgets.some((widget) => widget.id === id && widget.isEnabled)
}

export function CommandCenterPage() {
	const briefing = useCommandCenter()
	const navigate = useNavigate()
	const showSkeleton =
		briefing.loading.family &&
		briefing.loading.health &&
		briefing.loading.documents &&
		!briefing.hasAnyData

	if (showSkeleton) {
		return <HomePageSkeleton />
	}

	return (
		<div style={{ padding: pagePadding.home, color: C.text }}>
			<HomeGreeting
				greeting={briefing.greeting}
				greetingName={briefing.greetingName}
				dateLabel={briefing.dateLabel}
			/>

			{widgetIsVisible(briefing.widgets, 'attention') ? (
				<AttentionCenter
					items={briefing.attentionItems}
					isLoading={briefing.loading.health || briefing.loading.documents}
				/>
			) : null}

			{widgetIsVisible(briefing.widgets, 'search') ? (
				<UnifiedSearchBar />
			) : null}

			{widgetIsVisible(briefing.widgets, 'family') ? (
				<FamilyMemberSummaryGrid
					summaries={briefing.memberSummaries}
					isLoading={briefing.loading.family}
				/>
			) : null}

			{widgetIsVisible(briefing.widgets, 'quick-actions') ? (
				<QuickActionsBar actions={briefing.quickActions} />
			) : null}

			{widgetIsVisible(briefing.widgets, 'insights') ? (
				<CommandCenterInsights
					insights={briefing.insights}
					isLoading={briefing.loading.health}
				/>
			) : null}

			{widgetIsVisible(briefing.widgets, 'documents') ? (
				<CommandCenterDocuments
					documentCount={briefing.documentCount}
					expiringDocuments={briefing.expiringDocuments}
					isLoading={briefing.loading.documents}
				/>
			) : null}

			{widgetIsVisible(briefing.widgets, 'timeline') ? (
				<section style={{ marginBottom: 24 }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							marginBottom: 12,
						}}
					>
						<HomeSectionLabel>
							{COMMAND_CENTER_COPY.timelineLabel}
						</HomeSectionLabel>
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
							{COMMAND_CENTER_COPY.viewTimelineLabel}
						</button>
					</div>

					{briefing.loading.timeline ? (
						<div
							style={{
								height: 120,
								borderRadius: 18,
								background: C.card,
								border: `1px solid ${C.border}`,
								opacity: 0.55,
							}}
						/>
					) : briefing.timelinePreview.length === 0 ? (
						<div
							style={{
								padding: '16px',
								borderRadius: 16,
								border: `1px dashed ${C.border}`,
								fontSize: 13,
								color: C.textMuted,
							}}
						>
							Life events will appear here as you add health reports and
							documents.
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
							{briefing.timelinePreview.map((event, index) => (
								<div
									key={event.id}
									style={{
										borderBottom:
											index === briefing.timelinePreview.length - 1
												? 'none'
												: `1px solid ${C.border}`,
									}}
								>
									<TimelineEventRow event={event} />
								</div>
							))}
						</div>
					)}
				</section>
			) : null}

			{widgetIsVisible(briefing.widgets, 'explore') ? (
				<HomeExploreChronicle />
			) : null}
		</div>
	)
}
