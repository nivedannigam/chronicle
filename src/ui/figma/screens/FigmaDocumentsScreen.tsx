import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { useDocumentsContext } from '@/features/documents/context/DocumentsContext'
import { useFederatedLibrary } from '@/features/documents/hooks/useFederatedLibrary'
import { ROUTES } from '@/constants/routes'
import {
	DocumentModuleChip,
	DocumentSearchField,
	DocumentSectionLabel,
	DocumentSummaryCard,
} from '@/ui/figma/documents/document-ui'
import { FC } from '@/ui/figma/v2/atoms'

export function FigmaDocumentsScreen() {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')
	const { isLoading } = useDocumentsContext()
	const federated = useFederatedLibrary()

	const recentDocuments = useMemo(
		() => federated.allDocuments.slice(0, 6),
		[federated.allDocuments],
	)

	const moduleSummaries = useMemo(
		() =>
			federated.moduleSummaries.filter((summary) => summary.documentCount > 0),
		[federated.moduleSummaries],
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
			<p
				style={{
					color: FC.dim,
					fontSize: 14,
					lineHeight: 1.5,
					margin: '0 0 18px',
				}}
			>
				Your important documents, all in one place.
			</p>

			<DocumentSearchField
				value={query}
				onChange={setQuery}
				onSubmit={() => {
					if (query.trim()) {
						navigate(
							`${ROUTES.documentsLibrary}?q=${encodeURIComponent(query.trim())}`,
						)
					}
				}}
				placeholder="Search documents..."
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
					<DocumentSectionLabel>Recent documents</DocumentSectionLabel>
					{federated.allDocuments.length > recentDocuments.length ? (
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
					) : null}
				</div>

				{recentDocuments.length === 0 ? (
					<p
						style={{ color: FC.mid, fontSize: 14, lineHeight: 1.5, margin: 0 }}
					>
						No documents yet. Connect a module folder or import your first
						documents.
					</p>
				) : (
					recentDocuments.map((document) => (
						<DocumentSummaryCard key={document.id} document={document} />
					))
				)}
			</div>

			{moduleSummaries.length > 0 ? (
				<div style={{ marginBottom: 12 }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							marginBottom: 12,
						}}
					>
						<DocumentSectionLabel>Browse by module</DocumentSectionLabel>
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
					<div
						style={{
							display: 'flex',
							flexWrap: 'wrap',
							gap: 10,
						}}
					>
						{moduleSummaries.map((summary) => (
							<DocumentModuleChip
								key={summary.moduleId}
								label={summary.label}
								count={summary.documentCount}
								emoji={summary.emoji}
								onClick={() =>
									navigate(
										`${ROUTES.documentsLibrary}?module=${summary.moduleId}`,
									)
								}
							/>
						))}
					</div>
				</div>
			) : null}
		</div>
	)
}
