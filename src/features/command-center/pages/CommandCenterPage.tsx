import { useNavigate } from 'react-router-dom'
import { C, pagePadding } from '@/constants/colors'
import { COMMAND_CENTER_COPY, HOME_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { AttentionCenter } from '@/features/command-center/components/AttentionCenter'
import { CommandCenterDocuments } from '@/features/command-center/components/CommandCenterDocuments'
import { CommandCenterHealthSnapshot } from '@/features/command-center/components/CommandCenterHealthSnapshot'
import { FamilyMemberSummaryGrid } from '@/features/command-center/components/FamilyMemberSummaryGrid'
import { UnifiedSearchBar } from '@/features/command-center/components/UnifiedSearchBar'
import { useCommandCenter } from '@/features/command-center/hooks/useCommandCenter'
import { HomeAskCard } from '@/features/home/components/HomeAskCard'
import { HomeExploreChronicle } from '@/features/home/components/HomeExploreChronicle'
import { HomeGetStartedHero } from '@/features/home/components/HomeGetStartedHero'
import { HomeGreeting } from '@/features/home/components/HomeGreeting'
import { HomePageSkeleton } from '@/features/home/components/HomePageSkeleton'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'
import { HomeTodaySummary } from '@/features/home/components/HomeTodaySummary'
import { OnboardingFlow, useOnboarding } from '@/features/onboarding'
import { TimelineEventRow } from '@/features/timeline/components/TimelineEventRow'

export function CommandCenterPage() {
	const briefing = useCommandCenter()
	const navigate = useNavigate()
	const { isVisible, completeStep, dismiss } = useOnboarding()

	const showSkeleton =
		briefing.loading.family &&
		briefing.loading.health &&
		briefing.loading.documents &&
		!briefing.hasAnyData

	if (showSkeleton) {
		return <HomePageSkeleton />
	}

	return (
		<>
			{isVisible ? (
				<OnboardingFlow onCompleteStep={completeStep} onDismiss={dismiss} />
			) : null}

			<div style={{ padding: pagePadding.home, color: C.text }}>
				<HomeGreeting
					greeting={briefing.greeting}
					greetingName={briefing.greetingName}
					dateLabel={briefing.dateLabel}
				/>

				<HomeTodaySummary
					summary={briefing.todaySummary}
					isLoading={
						briefing.loading.health ||
						briefing.loading.documents ||
						briefing.loading.family
					}
				/>

				{briefing.isNewUser ? (
					<HomeGetStartedHero
						onSetupHealth={() => navigate(ROUTES.healthSettings)}
						onUploadDocument={() => navigate(ROUTES.documents)}
					/>
				) : null}

				{briefing.attentionItems.length > 0 ? (
					<AttentionCenter
						items={briefing.attentionItems}
						isLoading={briefing.loading.health || briefing.loading.documents}
					/>
				) : null}

				<FamilyMemberSummaryGrid
					summaries={briefing.memberSummaries}
					isLoading={briefing.loading.family}
				/>

				<CommandCenterHealthSnapshot
					status={briefing.healthSnapshot.status}
					reportCount={briefing.healthSnapshot.reportCount}
					latestReportTitle={briefing.healthSnapshot.latestReportTitle}
					isLoading={briefing.loading.health}
				/>

				<section style={{ marginBottom: 24 }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							marginBottom: 12,
						}}
					>
						<HomeSectionLabel>{HOME_COPY.activityLabel}</HomeSectionLabel>
						{briefing.timelinePreview.length > 0 ? (
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
						) : null}
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
								lineHeight: 1.5,
							}}
						>
							Recent events will appear here as you add health records and
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

				<HomeAskCard />

				{!briefing.isNewUser ? (
					<>
						<UnifiedSearchBar />
						<CommandCenterDocuments
							documentCount={briefing.documentCount}
							expiringDocuments={briefing.expiringDocuments}
							isLoading={briefing.loading.documents}
						/>
						<HomeExploreChronicle />
					</>
				) : null}
			</div>
		</>
	)
}
