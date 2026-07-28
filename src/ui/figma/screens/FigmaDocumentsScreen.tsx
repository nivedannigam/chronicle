import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { DOCUMENT_HOME_CATEGORIES } from '@/features/documents/constants/document-category-display'
import { useDocumentIntelligence } from '@/features/documents/hooks/useDocumentIntelligence'
import { searchDocumentsLocal } from '@/features/documents/services/document-intelligence.service'
import { ROUTES, documentsCategoryPath } from '@/constants/routes'
import {
	DocumentActivityRow,
	DocumentAttentionCard,
	DocumentSearchField,
	DocumentSectionLabel,
	DocumentStatPill,
	DocumentSummaryCard,
} from '@/ui/figma/documents/document-ui'
import {
	FigmaHeaderSearchButton,
	FigmaScreenHeader,
} from '@/ui/figma/shell/FigmaScreenHeader'
import { FC } from '@/ui/figma/v2/atoms'

export function FigmaDocumentsScreen() {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')
	const { hub, documents, memberNames, isLoading } = useDocumentIntelligence()

	const filteredDocuments = useMemo(() => {
		if (!query.trim()) return hub.allDocuments
		const ids = new Set(
			searchDocumentsLocal(documents, query, memberNames).map(
				(document) => document.id,
			),
		)
		return hub.allDocuments.filter((document) => ids.has(document.id))
	}, [documents, hub.allDocuments, memberNames, query])

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
				<FigmaScreenHeader
					title="Documents"
					subtitle="Understand your important life documents"
					actions={
						<FigmaHeaderSearchButton onClick={() => navigate(ROUTES.search)} />
					}
					paddingBottom={12}
				/>
				<div style={{ padding: '0 22px' }}>
					<ListSkeleton rows={6} />
				</div>
			</div>
		)
	}

	return (
		<div style={{ paddingBottom: 24 }}>
			<FigmaScreenHeader
				title="Documents"
				subtitle="Understand your important life documents"
				actions={
					<FigmaHeaderSearchButton onClick={() => navigate(ROUTES.search)} />
				}
				paddingBottom={12}
			/>

			<div style={{ padding: '0 22px' }}>
				<div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
					<DocumentStatPill
						value={String(hub.totalCount)}
						label="Important docs"
						accent={FC.blue}
					/>
					<DocumentStatPill
						value={String(hub.attentionCount)}
						label="Need attention"
						accent={hub.attentionCount > 0 ? FC.amber : FC.green}
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
				/>

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

				{hub.attention.length > 0 ? (
					<div style={{ marginBottom: 22 }}>
						<div style={{ marginBottom: 12 }}>
							<DocumentSectionLabel>Attention required</DocumentSectionLabel>
						</div>
						{hub.attention
							.filter((item) => item.severity !== 'low')
							.slice(0, 4)
							.map((item) => (
								<DocumentAttentionCard key={item.id} item={item} />
							))}
					</div>
				) : (
					<div style={{ marginBottom: 22 }}>
						<div style={{ marginBottom: 12 }}>
							<DocumentSectionLabel>Attention required</DocumentSectionLabel>
						</div>
						<p
							style={{
								color: FC.mid,
								fontSize: 14,
								margin: 0,
								lineHeight: 1.5,
							}}
						>
							No renewals or expiries need attention right now.
						</p>
					</div>
				)}

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

				{hub.recentActivity.length > 0 ? (
					<div style={{ marginBottom: 22 }}>
						<div style={{ marginBottom: 12 }}>
							<DocumentSectionLabel>Recent activity</DocumentSectionLabel>
						</div>
						<div>
							{hub.recentActivity.map((item) => (
								<DocumentActivityRow key={item.id} item={item} />
							))}
						</div>
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
						filteredDocuments.map((document) => (
							<DocumentSummaryCard
								key={document.id}
								document={document}
								showActions
							/>
						))
					)}
				</div>
			</div>
		</div>
	)
}
