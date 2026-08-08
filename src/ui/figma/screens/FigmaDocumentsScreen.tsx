import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { DOCUMENT_HOME_CATEGORIES } from '@/features/documents/constants/document-category-display'
import { useDocumentsContext } from '@/features/documents/context/DocumentsContext'
import { searchFederatedLibrarySummaries } from '@/features/documents/services/document-library.service'
import { ROUTES, documentsCategoryPath } from '@/constants/routes'
import {
	DocumentAttentionCard,
	DocumentDiscoveryCard,
	DocumentSearchField,
	DocumentSectionLabel,
	DocumentStatPill,
	DocumentSummaryCard,
} from '@/ui/figma/documents/document-ui'
import { FC } from '@/ui/figma/v2/atoms'

export function FigmaDocumentsScreen() {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')
	const { hub, isLoading } = useDocumentsContext()

	const filteredDocuments = useMemo(() => {
		if (!query.trim()) {
			return hub.allDocuments
		}

		return searchFederatedLibrarySummaries(hub.allDocuments, query)
	}, [hub.allDocuments, query])

	const categories = useMemo(
		() =>
			DOCUMENT_HOME_CATEGORIES.map((category) => ({
				...category,
				count: hub.categoryCounts[category.categoryId] ?? 0,
			})),
		[hub.categoryCounts],
	)

	if (isLoading) {
		return (
			<div style={{ paddingBottom: 24 }}>
				<ListSkeleton rows={6} />
			</div>
		)
	}

	return (
		<div style={{ paddingBottom: 24 }}>
			<div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
				<DocumentStatPill
					value={String(hub.totalCount)}
					label="Important docs"
					accent={FC.blue}
				/>
				<DocumentStatPill
					value={String(hub.needsAttention.length)}
					label="Needs attention"
					accent={hub.needsAttention.length > 0 ? FC.amber : FC.green}
				/>
				<DocumentStatPill
					value={String(hub.expiringCount)}
					label="Expiring soon"
					accent={FC.orange}
				/>
			</div>

			<DocumentSearchField
				value={query}
				onChange={setQuery}
				onSubmit={() => {
					if (query.trim()) {
						navigate(`${ROUTES.search}?q=${encodeURIComponent(query.trim())}`)
					}
				}}
				placeholder="Show my passport, vehicle papers, insurance receipts…"
			/>

			<div style={{ marginBottom: 22 }}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: 12,
					}}
				>
					<DocumentSectionLabel>Document library</DocumentSectionLabel>
					<button
						type="button"
						onClick={() => navigate(ROUTES.documentsLibrary)}
						style={{
							background: 'none',
							border: 'none',
							color: FC.blue,
							fontSize: 12,
							fontWeight: 700,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						View all
					</button>
				</div>
				{hub.allDocuments.slice(0, 3).map((document) => (
					<DocumentSummaryCard key={document.id} document={document} />
				))}
			</div>

			<div style={{ marginBottom: 22 }}>
				<div style={{ marginBottom: 12 }}>
					<DocumentSectionLabel>Categories</DocumentSectionLabel>
				</div>
				<div
					style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
				>
					{categories.map((category) => (
						<button
							key={category.categoryId}
							type="button"
							onClick={() =>
								navigate(documentsCategoryPath(category.categoryId))
							}
							style={{
								position: 'relative',
								overflow: 'hidden',
								background: `linear-gradient(145deg,${category.color}10,${category.color}05)`,
								border: `1px solid ${category.color}20`,
								borderRadius: 20,
								padding: '16px 14px',
								cursor: 'pointer',
								fontFamily: 'inherit',
								textAlign: 'left',
							}}
						>
							<span
								style={{ fontSize: 20, display: 'block', marginBottom: 14 }}
							>
								{category.emoji}
							</span>
							<p
								style={{
									color: FC.fg,
									fontSize: 14,
									fontWeight: 700,
									margin: '0 0 4px',
								}}
							>
								{category.label}
							</p>
							<p
								style={{
									color: category.color,
									fontSize: 11.5,
									fontWeight: 600,
									margin: 0,
								}}
							>
								{category.count} document{category.count === 1 ? '' : 's'}
							</p>
						</button>
					))}
				</div>
			</div>

			{hub.recentlyAdded.length > 0 ? (
				<div style={{ marginBottom: 22 }}>
					<div style={{ marginBottom: 12 }}>
						<DocumentSectionLabel>Recently added</DocumentSectionLabel>
					</div>
					{hub.recentlyAdded.map((document) => (
						<DocumentSummaryCard key={document.id} document={document} />
					))}
				</div>
			) : null}

			{hub.needsAttention.length > 0 ? (
				<div style={{ marginBottom: 22 }}>
					<div style={{ marginBottom: 12 }}>
						<DocumentSectionLabel>Needs attention</DocumentSectionLabel>
					</div>
					{hub.needsAttention.slice(0, 4).map((document) => (
						<DocumentSummaryCard key={document.id} document={document} />
					))}
				</div>
			) : null}

			{hub.expiringSoon.length > 0 ? (
				<div style={{ marginBottom: 22 }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							marginBottom: 12,
						}}
					>
						<DocumentSectionLabel>Expiring soon</DocumentSectionLabel>
						<button
							type="button"
							onClick={() => navigate(ROUTES.documentsExpiring)}
							style={{
								background: 'none',
								border: 'none',
								color: FC.orange,
								fontSize: 12,
								fontWeight: 700,
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							View all
						</button>
					</div>
					{hub.attention
						.filter(
							(item) =>
								item.kind === 'expiring_soon' || item.kind === 'expired',
						)
						.slice(0, 3)
						.map((item) => (
							<DocumentAttentionCard key={item.id} item={item} />
						))}
				</div>
			) : null}

			{hub.aiDiscoveries.length > 0 ? (
				<div style={{ marginBottom: 22 }}>
					<div style={{ marginBottom: 12 }}>
						<DocumentSectionLabel>Recent AI discoveries</DocumentSectionLabel>
					</div>
					{hub.aiDiscoveries.map((item) => (
						<DocumentDiscoveryCard key={item.id} item={item} />
					))}
				</div>
			) : null}

			<div>
				<div style={{ marginBottom: 12 }}>
					<DocumentSectionLabel>
						{query.trim() ? 'Search results' : 'All documents'}
					</DocumentSectionLabel>
				</div>
				{filteredDocuments.length === 0 ? (
					<p
						style={{
							color: FC.mid,
							fontSize: 14,
							margin: 0,
							lineHeight: 1.5,
						}}
					>
						{query.trim()
							? 'No documents match your search.'
							: 'Documents imported from Google Drive or uploaded will appear here with AI summaries.'}
					</p>
				) : (
					filteredDocuments
						.slice(0, query.trim() ? 20 : 6)
						.map((document) => (
							<DocumentSummaryCard
								key={document.id}
								document={document}
								showActions
							/>
						))
				)}
			</div>
		</div>
	)
}
