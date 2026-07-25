import { useMemo, useState, type CSSProperties } from 'react'
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

const PAGE_SIZE = 20

const MODULE_OPTIONS: Array<{ id: TimelineModule | 'all'; label: string }> = [
	{ id: 'all', label: 'All events' },
	{ id: 'health', label: 'Health' },
	{ id: 'documents', label: 'Documents' },
]

const IMPORTANCE_OPTIONS: Array<{
	id: TimelineImportance | 'all'
	label: string
}> = [
	{ id: 'all', label: 'All importance' },
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
		<div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
			<input
				type="search"
				value={searchQuery}
				onChange={(event) => onSearchChange(event.target.value)}
				placeholder="Search your timeline…"
				style={{
					width: '100%',
					padding: '12px 14px',
					borderRadius: 14,
					border: `1px solid ${C.border}`,
					background: C.card,
					color: C.text,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			/>
			<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
				<select
					value={moduleFilter}
					onChange={(event) =>
						onModuleChange(event.target.value as TimelineModule | 'all')
					}
					style={filterSelectStyle}
				>
					{MODULE_OPTIONS.map((option) => (
						<option key={option.id} value={option.id}>
							{option.label}
						</option>
					))}
				</select>
				<select
					value={importanceFilter}
					onChange={(event) =>
						onImportanceChange(event.target.value as TimelineImportance | 'all')
					}
					style={filterSelectStyle}
				>
					{IMPORTANCE_OPTIONS.map((option) => (
						<option key={option.id} value={option.id}>
							{option.label}
						</option>
					))}
				</select>
			</div>
		</div>
	)
}

const filterSelectStyle: CSSProperties = {
	padding: '8px 12px',
	borderRadius: 12,
	border: `1px solid ${C.border}`,
	background: C.card,
	color: C.textSec,
	fontFamily: 'inherit',
	fontSize: 12,
	fontWeight: 600,
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
				<div
					style={{
						padding: '24px 16px',
						borderRadius: 16,
						border: `1px dashed ${C.border}`,
						color: C.textMuted,
						fontSize: 14,
						lineHeight: 1.55,
					}}
				>
					Your life timeline will grow as Chronicle learns from health reports,
					documents, and future capabilities.
				</div>
			) : (
				<div style={{ display: 'grid', gap: 8 }}>
					{visibleGroups.map((group) => (
						<section key={group.key}>
							<TimelineGroupHeader label={group.label} />
							<div
								style={{
									background: C.card,
									border: `1px solid ${C.border}`,
									borderRadius: 18,
									overflow: 'hidden',
								}}
							>
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
							</div>
						</section>
					))}

					{hasMore ? (
						<button
							type="button"
							onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
							style={{
								marginTop: 8,
								width: '100%',
								padding: '12px 16px',
								borderRadius: 14,
								border: `1px solid ${C.border}`,
								background: C.card,
								color: C.accent,
								fontWeight: 700,
								fontSize: 13,
								cursor: 'pointer',
								fontFamily: 'inherit',
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
