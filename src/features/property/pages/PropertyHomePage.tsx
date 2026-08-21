import { useNavigate } from 'react-router-dom'
import {
	documentsCategoryPath,
	propertyAskPath,
	propertyDetailPath,
	propertyHistoryEventPath,
	ROUTES,
} from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { usePropertyContext } from '@/features/property/context/usePropertyContext'
import {
	PropertyAskBlock,
	PropertyAttentionRow,
	PropertyCard,
	PropertyEmptyState,
	PropertyLinkButton,
	PropertyRecentRow,
	PropertySectionLabel,
	PropertyStatusHero,
} from '@/ui/figma/property/property-ui'

function formatEventDate(value: string): string {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

export function PropertyHomePage() {
	const navigate = useNavigate()
	const { home, setupStatus, isLoading, isError, refetch, knowledge } =
		usePropertyContext()

	if (isLoading) {
		return (
			<div style={{ paddingBottom: 24 }}>
				<ListSkeleton rows={4} />
			</div>
		)
	}

	if (isError) {
		return (
			<PropertyEmptyState
				emoji="🏠"
				title="We couldn't load your property records"
				body="Try again in a moment."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (setupStatus === 'not_connected') {
		return (
			<PropertyEmptyState
				emoji="🏠"
				title="Connect your Home folder to organize your property records"
				body="Choose one root folder. Chronicle will find homes, registration papers, tax records, and related documents inside nested folders."
				primaryLabel="Connect Home folder"
				onPrimary={() => navigate(ROUTES.propertySettings)}
				secondaryLabel="Works with Google Drive"
			/>
		)
	}

	if (setupStatus === 'scanning' || setupStatus === 'organizing') {
		return (
			<div style={{ paddingBottom: 24 }}>
				<PropertyStatusHero
					headline="Looking through your property records"
					subline={
						knowledge.hasDocuments
							? 'Your property records are here. Chronicle is still organizing them.'
							: 'This usually takes a moment after connecting your folder.'
					}
				/>
			</div>
		)
	}

	if (setupStatus === 'empty') {
		return (
			<PropertyEmptyState
				emoji="🏠"
				title="We couldn't find any property records yet"
				body="Add property documents to your connected Home folder, or choose a different folder in Settings."
				primaryLabel="Open Settings"
				onPrimary={() => navigate(ROUTES.propertySettings)}
			/>
		)
	}

	return (
		<div style={{ paddingBottom: 24 }}>
			{home.propertyCards.length === 0 ? (
				<PropertyStatusHero
					headline={home.statusHeadline}
					subline={home.statusSubline}
				/>
			) : null}

			{home.propertyCards.map((card) => {
				const attention = home.attentionItems.find(
					(item) => item.propertyId === card.id,
				)

				return (
					<PropertyCard
						key={card.id}
						displayName={card.displayName}
						propertyTypeLabel={card.propertyTypeLabel}
						city={card.city}
						ownershipLabel={card.ownershipLabel}
						statusLabel={card.attentionCount > 0 ? 'Needs attention' : 'Good'}
						attentionCount={card.attentionCount}
						upcomingLabel={attention?.headline ?? null}
						onClick={() => navigate(propertyDetailPath(card.slug))}
					/>
				)
			})}

			{home.attentionItems.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<PropertySectionLabel>Important</PropertySectionLabel>
					{home.attentionItems.slice(0, 4).map((item) => (
						<PropertyAttentionRow
							key={item.id}
							headline={item.headline}
							subline={item.subline}
						/>
					))}
				</div>
			) : null}

			{home.recentActivity.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<PropertySectionLabel>Recent</PropertySectionLabel>
					{home.recentActivity.map((activity) => (
						<PropertyRecentRow
							key={activity.id}
							title={activity.title}
							dateLabel={formatEventDate(activity.eventDate)}
							onClick={() => navigate(propertyHistoryEventPath(activity.id))}
						/>
					))}
					{home.showHistoryLink ? (
						<div style={{ marginTop: 4 }}>
							<PropertyLinkButton
								label="View history →"
								onClick={() => navigate(ROUTES.propertyHistory)}
							/>
						</div>
					) : null}
				</div>
			) : home.showHistoryLink ? (
				<div style={{ marginBottom: 18 }}>
					<PropertyLinkButton
						label="View history →"
						onClick={() => navigate(ROUTES.propertyHistory)}
					/>
				</div>
			) : null}

			{home.showLibraryLink ? (
				<div style={{ marginBottom: 18 }}>
					<PropertySectionLabel>Documents</PropertySectionLabel>
					<PropertyLinkButton
						label="View documents →"
						onClick={() => navigate(documentsCategoryPath('property'))}
					/>
				</div>
			) : null}

			<PropertyAskBlock
				suggestions={home.askSuggestions}
				onSelect={(question) => navigate(propertyAskPath({ q: question }))}
			/>
		</div>
	)
}
