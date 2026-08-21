import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { propertyAskPath, ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { usePropertyContext } from '@/features/property/context/usePropertyContext'
import { buildPropertyDetailViewModel } from '@/features/property/services/property-detail.mapper'
import {
	PropertyAttentionRow,
	PropertyCrossModuleLink,
	PropertyDetailFactRow,
	PropertyDocumentRow,
	PropertyHistoryEventRow,
	PropertySectionLabel,
} from '@/ui/figma/property/property-ui'
import { FigmaScreenHeader } from '@/ui/figma/shell/FigmaScreenHeader'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function PropertyDetailPage() {
	const navigate = useNavigate()
	const { propertySlug = '' } = useParams()
	const { knowledge, isLoading } = usePropertyContext()

	const detail = useMemo(
		() =>
			buildPropertyDetailViewModel({
				knowledge,
				propertySlug,
			}),
		[knowledge, propertySlug],
	)

	if (isLoading) {
		return (
			<div style={{ paddingBottom: 24 }}>
				<ListSkeleton rows={5} />
			</div>
		)
	}

	if (!detail) {
		return (
			<div style={{ paddingBottom: 24 }}>
				<p style={{ color: FC.mid, fontSize: 14 }}>Property not found.</p>
				<button
					type="button"
					onClick={() => navigate(ROUTES.property)}
					style={{
						marginTop: 12,
						background: 'none',
						border: 'none',
						color: FC.blue,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					Back to Property
				</button>
			</div>
		)
	}

	return (
		<div style={{ paddingBottom: 24 }}>
			<FigmaScreenHeader
				title={detail.displayName}
				subtitle={detail.locationLabel}
				onBack={() => navigate(ROUTES.property)}
				backLabel="Property"
				paddingBottom={16}
			/>

			<div
				style={{
					...figmaCardStyle,
					borderRadius: 22,
					padding: '18px 18px',
					marginBottom: 18,
				}}
			>
				<p style={{ color: FC.dim, fontSize: 13, margin: '0 0 4px' }}>
					Ownership
				</p>
				<p
					style={{
						color: FC.fg,
						fontSize: 15,
						fontWeight: 600,
						margin: '0 0 10px',
					}}
				>
					{detail.ownershipLabel}
				</p>
				<p style={{ color: FC.dim, fontSize: 13, margin: '0 0 4px' }}>Status</p>
				<p style={{ color: FC.fg, fontSize: 15, margin: 0 }}>
					{detail.statusLabel}
				</p>
			</div>

			{detail.importantDates.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<PropertySectionLabel>Important dates</PropertySectionLabel>
					{detail.importantDates.map((entry) => (
						<PropertyDetailFactRow
							key={entry.label}
							label={entry.label}
							value={entry.value}
						/>
					))}
				</div>
			) : null}

			{detail.keyFacts.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<PropertySectionLabel>Key information</PropertySectionLabel>
					{detail.keyFacts.map((fact) => (
						<PropertyDetailFactRow
							key={fact.label}
							label={fact.label}
							value={fact.value}
						/>
					))}
				</div>
			) : null}

			{detail.attentionItems.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<PropertySectionLabel>Attention</PropertySectionLabel>
					{detail.attentionItems.map((item) => (
						<PropertyAttentionRow
							key={item.id}
							headline={item.headline}
							subline={item.subline}
						/>
					))}
				</div>
			) : null}

			{detail.linkedInsurance.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<PropertySectionLabel>Linked insurance</PropertySectionLabel>
					{detail.linkedInsurance.map((link) => (
						<PropertyCrossModuleLink
							key={link.label}
							label={link.label}
							onClick={() => navigate(link.path)}
						/>
					))}
				</div>
			) : null}

			{detail.linkedFinance.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<PropertySectionLabel>Linked finance</PropertySectionLabel>
					{detail.linkedFinance.map((link) => (
						<PropertyCrossModuleLink
							key={link.label}
							label={link.label}
							onClick={() => navigate(link.path)}
						/>
					))}
				</div>
			) : null}

			{detail.documents.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<PropertySectionLabel>Documents</PropertySectionLabel>
					{detail.documents.map((document) => (
						<PropertyDocumentRow
							key={document.id}
							title={document.title}
							typeLabel={document.typeLabel}
							dateLabel={document.dateLabel}
							onClick={() => navigate(document.path)}
						/>
					))}
				</div>
			) : null}

			{detail.history.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<PropertySectionLabel>History</PropertySectionLabel>
					{detail.history.slice(0, 5).map((event) => (
						<PropertyHistoryEventRow
							key={event.id}
							title={event.title}
							dateLabel={event.dateLabel}
							onClick={() => navigate(event.path)}
						/>
					))}
				</div>
			) : null}

			<button
				type="button"
				onClick={() =>
					navigate(
						propertyAskPath({
							q: `Tell me about my ${detail.displayName}`,
							propertySlug: detail.slug,
						}),
					)
				}
				style={{
					width: '100%',
					background: `${FC.blue}18`,
					border: `1px solid ${FC.blue}35`,
					borderRadius: 18,
					padding: '12px 16px',
					color: FC.blue,
					fontSize: 14,
					fontWeight: 700,
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				Ask about this property
			</button>
		</div>
	)
}
