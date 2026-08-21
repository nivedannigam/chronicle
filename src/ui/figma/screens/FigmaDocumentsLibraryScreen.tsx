import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { useDocumentsContext } from '@/features/documents/context/DocumentsContext'
import { useFederatedLibrary } from '@/features/documents/hooks/useFederatedLibrary'
import {
	defaultLibraryFilters,
	filterFederatedLibrarySummaries,
} from '@/features/documents/services/document-library.service'
import type { DocumentLibraryFilters } from '@/features/documents/types/document-intelligence.types'
import { getLifeModuleById } from '@/constants/modules'
import { ROUTES } from '@/constants/routes'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import {
	DocumentSearchField,
	DocumentSectionLabel,
	DocumentSummaryCard,
} from '@/ui/figma/documents/document-ui'
import {
	countActiveFilters,
	LibraryFilterButton,
	LibraryFilterSheet,
} from '@/ui/figma/documents/LibraryFilterSheet'
import { FC } from '@/ui/figma/v2/atoms'

function resolveActiveFilterLabel(
	filters: ReturnType<typeof defaultLibraryFilters>,
): string | null {
	if (!filters.moduleId) {
		return null
	}

	return getLifeModuleById(filters.moduleId)?.name ?? 'Library'
}

export function FigmaDocumentsLibraryScreen() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const { members } = useFamilyContext()
	const { availableYears, isLoading: documentsLoading } = useDocumentsContext()
	const federated = useFederatedLibrary()
	const [filtersOpen, setFiltersOpen] = useState(false)
	const [draftFilters, setDraftFilters] = useState<DocumentLibraryFilters>(
		() => ({
			...defaultLibraryFilters(),
			query: searchParams.get('q') ?? '',
			categoryId: searchParams.get('category'),
			moduleId: searchParams.get('module') as
				DocumentLibraryFilters['moduleId'] | null,
		}),
	)
	const [filters, setFilters] = useState(draftFilters)

	const results = useMemo(
		() =>
			filterFederatedLibrarySummaries(
				federated.allDocuments,
				filters,
				Object.fromEntries(
					members.map((member) => [member.id, member.displayName]),
				),
			),
		[federated.allDocuments, filters, members],
	)

	const activeFilterLabel = resolveActiveFilterLabel(filters)
	const totalAvailable = federated.allDocuments.length
	const activeFilterCount = countActiveFilters(filters)
	const isLoading = documentsLoading || federated.isLoading

	if (isLoading) {
		return (
			<div style={{ paddingBottom: 24 }}>
				<ListSkeleton rows={6} />
			</div>
		)
	}

	return (
		<div style={{ paddingBottom: 24 }}>
			<DocumentSearchField
				value={filters.query}
				onChange={(query) => setFilters((current) => ({ ...current, query }))}
				onSubmit={() => {
					if (filters.query.trim()) {
						navigate(
							`${ROUTES.search}?q=${encodeURIComponent(filters.query.trim())}`,
						)
					}
				}}
				placeholder="Search documents..."
			/>

			<LibraryFilterButton
				activeCount={activeFilterCount}
				onClick={() => {
					setDraftFilters(filters)
					setFiltersOpen(true)
				}}
			/>

			<div style={{ marginBottom: 12 }}>
				<DocumentSectionLabel>
					{results.length} document{results.length === 1 ? '' : 's'}
					{totalAvailable > 0 && results.length !== totalAvailable
						? ` · ${totalAvailable} total`
						: ''}
				</DocumentSectionLabel>
			</div>

			{results.length === 0 ? (
				<div>
					<p
						style={{ color: FC.mid, fontSize: 14, lineHeight: 1.5, margin: 0 }}
					>
						{activeFilterLabel
							? `No ${activeFilterLabel.toLowerCase()} documents match your filters.`
							: 'No documents match your filters.'}
					</p>
					{totalAvailable > 0 ? (
						<button
							type="button"
							onClick={() => setFilters(defaultLibraryFilters())}
							style={{
								marginTop: 12,
								background: 'none',
								border: 'none',
								color: FC.blue,
								fontSize: 13,
								fontWeight: 700,
								cursor: 'pointer',
								fontFamily: 'inherit',
								padding: 0,
							}}
						>
							Show all {totalAvailable} documents
						</button>
					) : null}
				</div>
			) : (
				results.map((document) => (
					<DocumentSummaryCard
						key={document.id}
						document={document}
						showActions
					/>
				))
			)}

			<LibraryFilterSheet
				open={filtersOpen}
				filters={draftFilters}
				moduleSummaries={federated.moduleSummaries}
				members={members}
				availableYears={availableYears}
				onChange={setDraftFilters}
				onApply={() => {
					setFilters(draftFilters)
					setFiltersOpen(false)
				}}
				onClear={() => {
					const cleared = defaultLibraryFilters()
					setDraftFilters(cleared)
					setFilters(cleared)
					setFiltersOpen(false)
				}}
				onClose={() => setFiltersOpen(false)}
			/>
		</div>
	)
}
