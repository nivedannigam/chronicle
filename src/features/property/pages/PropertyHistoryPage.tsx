import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { propertyHistoryEventPath, ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { usePropertyContext } from '@/features/property/context/usePropertyContext'
import {
	PropertyEmptyState,
	PropertyHistoryEventRow,
	PropertySectionLabel,
} from '@/ui/figma/property/property-ui'
import { FC } from '@/ui/figma/v2/atoms'

function formatEventDate(value: string): string {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function groupEventsByYear(
	events: Array<{ id: string; title: string; eventDate: string }>,
) {
	const groups = new Map<number, typeof events>()

	for (const event of events) {
		const year = new Date(event.eventDate).getFullYear()
		const bucket = groups.get(year) ?? []
		bucket.push(event)
		groups.set(year, bucket)
	}

	return [...groups.entries()]
		.sort((left, right) => right[0] - left[0])
		.map(([year, items]) => ({ year, items }))
}

export function PropertyHistoryPage() {
	const navigate = useNavigate()
	const { knowledge, isLoading, isError, refetch } = usePropertyContext()

	const grouped = useMemo(
		() => groupEventsByYear(knowledge.timeline),
		[knowledge.timeline],
	)

	if (isLoading) {
		return (
			<div style={{ paddingBottom: 24 }}>
				<ListSkeleton rows={5} />
			</div>
		)
	}

	if (isError) {
		return (
			<PropertyEmptyState
				emoji="🏠"
				title="We couldn't load your property history"
				body="Try again in a moment."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (knowledge.timeline.length === 0) {
		return (
			<PropertyEmptyState
				emoji="📖"
				title={
					knowledge.hasDocuments
						? 'Property history will appear as records are organized'
						: 'No property history yet'
				}
				body="Meaningful events like purchase, registration, tax records, and insurance renewals appear here."
				primaryLabel="Back to Property Home"
				onPrimary={() => navigate(ROUTES.property)}
			/>
		)
	}

	return (
		<div style={{ paddingBottom: 24 }}>
			<PropertySectionLabel>Property History</PropertySectionLabel>
			{grouped.map((group) => (
				<div key={group.year} style={{ marginBottom: 24 }}>
					<p
						style={{
							color: FC.fg,
							fontSize: 24,
							fontWeight: 700,
							margin: '0 0 14px',
							letterSpacing: -0.4,
						}}
					>
						{group.year}
					</p>
					{group.items.map((event) => (
						<PropertyHistoryEventRow
							key={event.id}
							title={event.title}
							dateLabel={formatEventDate(event.eventDate)}
							onClick={() => navigate(propertyHistoryEventPath(event.id))}
						/>
					))}
				</div>
			))}
		</div>
	)
}

export function PropertyHistoryEventDetailPage() {
	const navigate = useNavigate()
	const { eventId = '' } = useParams()
	const { knowledge } = usePropertyContext()

	const event = knowledge.timeline.find((entry) => entry.id === eventId)
	const property = event
		? knowledge.properties.find((entry) => entry.id === event.propertyId)
		: null

	if (!event) {
		return (
			<div style={{ paddingBottom: 24 }}>
				<p style={{ color: FC.mid }}>Event not found.</p>
				<button
					type="button"
					onClick={() => navigate(ROUTES.propertyHistory)}
					style={{
						marginTop: 12,
						background: 'none',
						border: 'none',
						color: FC.blue,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					Back to history
				</button>
			</div>
		)
	}

	return (
		<div style={{ paddingBottom: 24 }}>
			<PropertySectionLabel>
				{property?.displayName ?? 'Property'}
			</PropertySectionLabel>
			<p
				style={{
					color: FC.fg,
					fontSize: 22,
					fontWeight: 700,
					margin: '0 0 8px',
				}}
			>
				{event.title}
			</p>
			<p style={{ color: FC.dim, fontSize: 14, margin: '0 0 18px' }}>
				{formatEventDate(event.eventDate)}
			</p>
			<button
				type="button"
				onClick={() => navigate(ROUTES.propertyHistory)}
				style={{
					background: 'none',
					border: 'none',
					color: FC.blue,
					cursor: 'pointer',
					fontFamily: 'inherit',
					padding: 0,
				}}
			>
				← Back to history
			</button>
		</div>
	)
}
