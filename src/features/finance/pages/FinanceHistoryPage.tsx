import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
	financeDocumentPath,
	financeHistoryEventPath,
	ROUTES,
} from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFinanceContext } from '@/features/finance/context/useFinanceContext'
import {
	formatFinanceEventDate,
	formatFinanceValueChange,
	groupFinanceTimelineEvents,
	resolveFinanceHistoryEmptyCopy,
} from '@/features/finance-knowledge/services/finance-timeline-display.service'
import { applyFinanceTimelinePrivacy } from '@/features/finance-knowledge/services/finance-timeline.builder.service'
import { readFinancePreferences } from '@/features/finance-knowledge/services/finance-preferences.service'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import {
	FinanceEmptyState,
	FinanceHistoryEventRow,
	FinanceHistoryLink,
	FinanceSectionLabel,
} from '@/ui/figma/finance/finance-ui'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function FinanceHistoryPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { knowledge, isLoading, isError, refetch } = useFinanceContext()

	const preferences = useMemo(
		() => readFinancePreferences(user?.id ?? 'anonymous'),
		[user?.id],
	)

	const grouped = useMemo(
		() =>
			groupFinanceTimelineEvents(
				knowledge.timeline.map((event) =>
					applyFinanceTimelinePrivacy(event, preferences),
				),
			),
		[knowledge.timeline, preferences],
	)

	const emptyCopy = resolveFinanceHistoryEmptyCopy({
		hasDocuments: knowledge.hasDocuments,
		eventCount: knowledge.timeline.length,
	})

	if (isLoading) {
		return (
			<div style={{ paddingBottom: 24 }}>
				<ListSkeleton rows={5} />
			</div>
		)
	}

	if (isError) {
		return (
			<FinanceEmptyState
				emoji="💰"
				title="We couldn't load your financial history"
				body="Try again in a moment."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (knowledge.timeline.length === 0) {
		return (
			<FinanceEmptyState
				emoji="📖"
				title={emptyCopy.title}
				body={emptyCopy.body}
				primaryLabel="Back to Finance Home"
				onPrimary={() => navigate(ROUTES.finance)}
			/>
		)
	}

	return (
		<div style={{ paddingBottom: 24 }}>
			<FinanceSectionLabel>Finance History</FinanceSectionLabel>
			{grouped.map((yearGroup) => (
				<div key={yearGroup.year} style={{ marginBottom: 24 }}>
					<p
						style={{
							color: FC.fg,
							fontSize: 24,
							fontWeight: 700,
							margin: '0 0 14px',
							letterSpacing: -0.4,
						}}
					>
						{yearGroup.year}
					</p>
					{yearGroup.months.map((monthGroup) => (
						<div key={monthGroup.key} style={{ marginBottom: 18 }}>
							<p
								style={{
									color: 'rgba(255,255,255,0.55)',
									fontSize: 13,
									fontWeight: 700,
									margin: '0 0 10px',
									textTransform: 'uppercase',
									letterSpacing: 0.4,
								}}
							>
								{monthGroup.label}
							</p>
							{monthGroup.events.map((event) => (
								<FinanceHistoryEventRow
									key={event.id}
									title={event.title}
									entityName={event.entityDisplayName}
									dateLabel={formatFinanceEventDate(event.eventDate)}
									changeLabel={formatFinanceValueChange(
										event.metadata.previousValue,
										event.metadata.currentValue,
										{
											hideBalances:
												preferences.hideBalancesInLists ||
												preferences.hideSensitiveTimelinePreviews,
										},
									)}
									onClick={() => navigate(financeHistoryEventPath(event.id))}
								/>
							))}
						</div>
					))}
				</div>
			))}
		</div>
	)
}

export function FinanceHistoryEventDetailPage() {
	const navigate = useNavigate()
	const { eventId: rawEventId } = useParams<{ eventId: string }>()
	const { user } = useAuth()
	const { knowledge, isLoading, isError, refetch } = useFinanceContext()
	const eventId = decodeURIComponent(rawEventId ?? '')

	const preferences = useMemo(
		() => readFinancePreferences(user?.id ?? 'anonymous'),
		[user?.id],
	)

	const event = useMemo(() => {
		const match = knowledge.timeline.find((entry) => entry.id === eventId)
		return match ? applyFinanceTimelinePrivacy(match, preferences) : null
	}, [eventId, knowledge.timeline, preferences])

	if (isLoading) {
		return (
			<div style={{ paddingBottom: 24 }}>
				<ListSkeleton rows={4} />
			</div>
		)
	}

	if (isError) {
		return (
			<FinanceEmptyState
				emoji="💰"
				title="We couldn't load your financial history"
				body="Try again in a moment."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (!event) {
		return (
			<FinanceEmptyState
				emoji="📖"
				title="Event not found"
				body="This financial history event is no longer available."
				primaryLabel="Back to Finance History"
				onPrimary={() => navigate(ROUTES.financeHistory)}
			/>
		)
	}

	const changeLabel = formatFinanceValueChange(
		event.metadata.previousValue,
		event.metadata.currentValue,
		{
			hideBalances:
				preferences.hideBalancesInLists ||
				preferences.hideSensitiveTimelinePreviews,
		},
	)
	const sourceDocumentId = event.sourceDocumentIds[0] ?? null

	return (
		<div style={{ paddingBottom: 24 }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.financeHistory)}
				style={{
					background: 'none',
					border: 'none',
					color: 'rgba(255,255,255,0.55)',
					fontSize: 13,
					padding: 0,
					marginBottom: 16,
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				← Finance History
			</button>

			<div
				style={{
					...figmaCardStyle,
					borderRadius: 24,
					padding: '22px 20px',
					marginBottom: 18,
				}}
			>
				<p
					style={{
						color: FC.fg,
						fontSize: 20,
						fontWeight: 700,
						margin: '0 0 8px',
						lineHeight: 1.35,
					}}
				>
					{event.title}
				</p>
				{event.entityDisplayName ? (
					<p style={{ color: FC.dim, fontSize: 14, margin: '0 0 8px' }}>
						{event.entityDisplayName}
					</p>
				) : null}
				{changeLabel ? (
					<p
						style={{
							color: FC.fg,
							fontSize: 16,
							fontWeight: 600,
							margin: '0 0 8px',
						}}
					>
						{changeLabel}
					</p>
				) : null}
				<p style={{ color: FC.dim, fontSize: 13, margin: 0 }}>
					{formatFinanceEventDate(event.eventDate)}
				</p>
			</div>

			{event.metadata.sourceDocumentLabel && sourceDocumentId ? (
				<div style={{ marginBottom: 18 }}>
					<FinanceSectionLabel>Source</FinanceSectionLabel>
					<p style={{ color: FC.dim, fontSize: 13, margin: '0 0 10px' }}>
						{event.metadata.sourceDocumentLabel}
					</p>
					<FinanceHistoryLink
						label="View document"
						onClick={() => navigate(financeDocumentPath(sourceDocumentId))}
					/>
				</div>
			) : null}
		</div>
	)
}
