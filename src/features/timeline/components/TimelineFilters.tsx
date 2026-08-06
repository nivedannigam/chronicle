import { useMemo, useState } from 'react'
import { C } from '@/constants/colors'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { TimelineEventRow } from '@/features/timeline/components/TimelineEventRow'
import { TimelineGroupHeader } from '@/features/timeline/components/TimelineGroupHeader'
import { useTimelineEvents } from '@/features/timeline/hooks/useTimelineEvents'
import type {
	TimelineImportance,
	TimelineModule,
} from '@/features/timeline/types/timeline.types'
import { FigmaCard } from '@/ui/figma/components/primitives'
import {
	HealthFilterChip,
	HealthSearchField,
} from '@/ui/figma/health/health-ui'
import { healthPrimaryButtonStyle } from '@/ui/figma/health/health-ui.styles'

const PAGE_SIZE = 20

const MODULE_OPTIONS: Array<{ id: TimelineModule | 'all'; label: string }> = [
	{ id: 'all', label: 'All events' },
	{ id: 'health', label: 'Health' },
	{ id: 'insurance', label: 'Insurance' },
	{ id: 'documents', label: 'Documents' },
]

const IMPORTANCE_OPTIONS: Array<{
	id: TimelineImportance | 'all'
	label: string
}> = [
	{ id: 'all', label: 'All' },
	{ id: 'high', label: 'High' },
	{ id: 'medium', label: 'Medium' },
	{ id: 'low', label: 'Low' },
]

export function TimelineFiltersBar({
	searchQuery,
	onSearchChange,
	moduleFilter,
	onModuleChange,
	importanceFilter,
	onImportanceChange,
}: {
	searchQuery: string
	onSearchChange: (value: string) => void
	moduleFilter: TimelineModule | 'all'
	onModuleChange: (value: TimelineModule | 'all') => void
	importanceFilter: TimelineImportance | 'all'
	onImportanceChange: (value: TimelineImportance | 'all') => void
}) {
	return (
		<div style={{ marginBottom: 18 }}>
			<HealthSearchField
				value={searchQuery}
				onChange={onSearchChange}
				placeholder="Search your timeline…"
				ariaLabel="Search timeline"
			/>

			<div
				style={{
					display: 'flex',
					gap: 8,
					overflowX: 'auto',
					scrollbarWidth: 'none',
					marginBottom: 8,
				}}
			>
				{MODULE_OPTIONS.map((option) => (
					<HealthFilterChip
						key={option.id}
						label={option.label}
						active={moduleFilter === option.id}
						onClick={() => onModuleChange(option.id)}
					/>
				))}
			</div>

			<div
				style={{
					display: 'flex',
					gap: 8,
					overflowX: 'auto',
					scrollbarWidth: 'none',
				}}
			>
				{IMPORTANCE_OPTIONS.map((option) => (
					<HealthFilterChip
						key={option.id}
						label={option.label}
						active={importanceFilter === option.id}
						onClick={() => onImportanceChange(option.id)}
					/>
				))}
			</div>
		</div>
	)
}

export function TimelineFeed() {
	const [searchQuery, setSearchQuery] = useState('')
	const [moduleFilter, setModuleFilter] = useState<TimelineModule | 'all'>(
		'all',
	)
	const [importanceFilter, setImportanceFilter] = useState<
		TimelineImportance | 'all'
	>('all')
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

	const filters = useMemo(
		() => ({
			searchQuery,
			modules: moduleFilter === 'all' ? undefined : [moduleFilter],
			importance: importanceFilter === 'all' ? undefined : [importanceFilter],
		}),
		[searchQuery, moduleFilter, importanceFilter],
	)

	const timeline = useTimelineEvents(filters)
	const visibleGroups = useMemo(() => {
		let remaining = visibleCount
		const groups = []

		for (const group of timeline.groups) {
			if (remaining <= 0) {
				break
			}

			const events = group.events.slice(0, remaining)
			remaining -= events.length

			if (events.length > 0) {
				groups.push({ ...group, events })
			}
		}

		return groups
	}, [timeline.groups, visibleCount])

	const hasMore = visibleCount < timeline.totalCount

	return (
		<div>
			<TimelineFiltersBar
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				moduleFilter={moduleFilter}
				onModuleChange={setModuleFilter}
				importanceFilter={importanceFilter}
				onImportanceChange={setImportanceFilter}
			/>

			{timeline.isError ? (
				<InlineErrorBanner
					message="Could not load your timeline."
					onRetry={timeline.refetch}
				/>
			) : null}

			{timeline.isLoading ? (
				<ListSkeleton rows={5} height={64} />
			) : timeline.totalCount === 0 ? (
				<FigmaCard
					style={{
						border: `1px dashed ${C.border}`,
						padding: '24px 16px',
						color: C.textMuted,
						fontSize: 14,
						lineHeight: 1.55,
						textAlign: 'center',
					}}
				>
					<div style={{ fontSize: 28, marginBottom: 8 }}>🕐</div>
					Your life timeline will grow as Chronicle learns from health reports,
					documents, and future capabilities.
				</FigmaCard>
			) : (
				<div style={{ display: 'grid', gap: 12 }}>
					{visibleGroups.map((group) => (
						<section key={group.key}>
							<TimelineGroupHeader label={group.label} />
							<FigmaCard>
								{group.events.map((event, index) => (
									<div
										key={event.id}
										style={{
											borderBottom:
												index === group.events.length - 1
													? 'none'
													: `1px solid ${C.border}`,
										}}
									>
										<TimelineEventRow event={event} />
									</div>
								))}
							</FigmaCard>
						</section>
					))}

					{hasMore ? (
						<button
							type="button"
							onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
							style={{
								...healthPrimaryButtonStyle,
								width: '100%',
								justifyContent: 'center',
								padding: '12px 16px',
								fontSize: 13,
							}}
						>
							Load more
						</button>
					) : null}
				</div>
			)}
		</div>
	)
}
