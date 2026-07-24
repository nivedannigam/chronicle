import { C, pagePadding } from '@/constants/colors'
import { HomeAiSummaryCard } from '@/features/home/components/HomeAiSummaryCard'
import { HomeAskCard } from '@/features/home/components/HomeAskCard'
import { HomeContinueCard } from '@/features/home/components/HomeContinueCard'
import { HomeExploreChronicle } from '@/features/home/components/HomeExploreChronicle'
import { HomeGreeting } from '@/features/home/components/HomeGreeting'
import { HomeHealthSnapshot } from '@/features/home/components/HomeHealthSnapshot'
import { HomePageSkeleton } from '@/features/home/components/HomePageSkeleton'
import { HomeRecentActivity } from '@/features/home/components/HomeRecentActivity'
import { useHomeBriefing } from '@/features/home/hooks/useHomeBriefing'

export function HomePage() {
	const briefing = useHomeBriefing()

	if (briefing.isLoading && !briefing.hasHealthData) {
		return <HomePageSkeleton />
	}

	return (
		<div style={{ padding: pagePadding.home, color: C.text }}>
			<HomeGreeting
				greeting={briefing.greeting}
				greetingName={briefing.greetingName}
				dateLabel={briefing.dateLabel}
			/>

			<HomeAiSummaryCard
				summary={briefing.aiSummary}
				tone={briefing.aiSummaryTone}
				isLoading={briefing.isLoading}
			/>

			<HomeContinueCard
				item={briefing.continueItem}
				isLoading={briefing.isLoading}
			/>

			<HomeHealthSnapshot briefing={briefing} />

			<HomeExploreChronicle />

			<HomeAskCard />

			<HomeRecentActivity
				activities={briefing.activities}
				totalCount={briefing.totalActivityCount}
				isLoading={briefing.isLoading}
			/>
		</div>
	)
}
