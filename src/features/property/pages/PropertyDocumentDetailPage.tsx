import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { documentPath, propertyDetailPath, ROUTES } from '@/constants/routes'
import { usePropertyContext } from '@/features/property/context/usePropertyContext'
import { PropertySectionLabel } from '@/ui/figma/property/property-ui'
import { FigmaScreenHeader } from '@/ui/figma/shell/FigmaScreenHeader'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

function formatDisplayDate(value: string | null): string | null {
	if (!value) return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString('en-US', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

export function PropertyDocumentDetailPage() {
	const navigate = useNavigate()
	const { documentId = '' } = useParams()
	const { knowledge } = usePropertyContext()

	const record = useMemo(
		() =>
			knowledge.documents.find(
				(document) => document.chronicleDocumentId === documentId,
			),
		[knowledge.documents, documentId],
	)

	const property = useMemo(
		() =>
			record
				? knowledge.properties.find((entry) => entry.id === record.propertyId)
				: null,
		[knowledge.properties, record],
	)

	if (!record) {
		return (
			<div style={{ paddingBottom: 24 }}>
				<p style={{ color: FC.mid }}>Document not found.</p>
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
				title={record.title}
				subtitle={`Property · ${record.typeLabel}`}
				onBack={() =>
					property
						? navigate(propertyDetailPath(property.slug))
						: navigate(ROUTES.property)
				}
				backLabel={property ? property.displayName : 'Property'}
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
				<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 4px' }}>Type</p>
				<p style={{ color: FC.fg, fontSize: 14, margin: '0 0 12px' }}>
					{record.typeLabel}
				</p>
				<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 4px' }}>Owner</p>
				<p style={{ color: FC.fg, fontSize: 14, margin: '0 0 12px' }}>
					{record.ownerName}
				</p>
				{record.maskedRegistrationNumber ? (
					<>
						<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 4px' }}>
							Registration
						</p>
						<p style={{ color: FC.fg, fontSize: 14, margin: '0 0 12px' }}>
							{record.maskedRegistrationNumber}
						</p>
					</>
				) : null}
				{formatDisplayDate(record.documentDate) ? (
					<>
						<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 4px' }}>
							Date
						</p>
						<p style={{ color: FC.fg, fontSize: 14, margin: 0 }}>
							{formatDisplayDate(record.documentDate)}
						</p>
					</>
				) : null}
			</div>

			{property ? (
				<button
					type="button"
					onClick={() => navigate(propertyDetailPath(property.slug))}
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
						marginBottom: 12,
					}}
				>
					View property
				</button>
			) : null}

			<PropertySectionLabel>Source document</PropertySectionLabel>
			<button
				type="button"
				onClick={() => navigate(documentPath(record.chronicleDocumentId))}
				style={{
					...figmaCardStyle,
					width: '100%',
					borderRadius: 16,
					padding: '12px 14px',
					cursor: 'pointer',
					fontFamily: 'inherit',
					textAlign: 'left',
					color: FC.fg,
					fontSize: 14,
					fontWeight: 600,
				}}
			>
				Open in Library →
			</button>
		</div>
	)
}
