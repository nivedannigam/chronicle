import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { DOCUMENT_HOME_CATEGORIES } from '@/features/documents/constants/document-category-display'
import { useDocumentsContext } from '@/features/documents/context/DocumentsContext'
import { useFederatedLibrary } from '@/features/documents/hooks/useFederatedLibrary'
import {
	defaultLibraryFilters,
	filterFederatedLibrarySummaries,
} from '@/features/documents/services/document-library.service'
import type {
	DocumentConsumerStatus,
	DocumentLibraryFilters,
} from '@/features/documents/types/document-intelligence.types'
import { ROUTES } from '@/constants/routes'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import {
	DocumentFilterChip,
	DocumentSearchField,
	DocumentSectionLabel,
	DocumentSummaryCard,
} from '@/ui/figma/documents/document-ui'
import { FC } from '@/ui/figma/v2/atoms'

const STATUS_FILTERS: DocumentConsumerStatus[] = [
	'Ready',
	'Needs Help',
	'Still Organizing',
]

const SOURCE_FILTERS = [
	{ id: 'google-drive', label: 'Google Drive' },
	{ id: 'upload', label: 'Manual Upload' },
] as const

function resolveActiveFilterLabel(
	filters: ReturnType<typeof defaultLibraryFilters>,
): string | null {
	if (filters.moduleId) {
		return filters.moduleId === 'health'
			? 'Health'
			: filters.moduleId === 'insurance'
				? 'Insurance'
				: filters.moduleId === 'vehicles'
					? 'Vehicles'
					: 'Library'
	}

	if (filters.categoryId) {
		return (
			DOCUMENT_HOME_CATEGORIES.find(
				(category) => category.categoryId === filters.categoryId,
			)?.label ?? filters.categoryId
		)
	}

	return null
}

export function FigmaDocumentsLibraryScreen() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const { members } = useFamilyContext()
	const {
		hub,
		memberNames,
		availableYears,
		isLoading: documentsLoading,
	} = useDocumentsContext()
	const federated = useFederatedLibrary()
	const [filters, setFilters] = useState(() => ({
		...defaultLibraryFilters(),
		categoryId: searchParams.get('category'),
		moduleId: searchParams.get('module') as
			DocumentLibraryFilters['moduleId'] | null,
	}))

	const results = useMemo(
		() =>
			filterFederatedLibrarySummaries(
				federated.allDocuments,
				filters,
				memberNames,
			),
		[federated.allDocuments, filters, memberNames],
	)

	const filteredModuleCount = useMemo(() => {
		const moduleIds = new Set(
			results.flatMap((document) =>
				document.relatedModules.map((module) => module.moduleId),
			),
		)

		return moduleIds.size
	}, [results])

	const activeFilterLabel = resolveActiveFilterLabel(filters)
	const totalAvailable = federated.allDocuments.length

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
				placeholder="Passport, Mahindra, insurance, health report, PAN card…"
			/>

			{federated.moduleSummaries.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<DocumentSectionLabel>By module</DocumentSectionLabel>
					<div
						style={{
							display: 'flex',
							gap: 8,
							overflowX: 'auto',
							paddingTop: 10,
							scrollbarWidth: 'none',
						}}
					>
						<DocumentFilterChip
							label="All modules"
							active={!filters.moduleId}
							onClick={() =>
								setFilters((current) => ({ ...current, moduleId: null }))
							}
						/>
						{federated.moduleSummaries.map((summary) => (
							<DocumentFilterChip
								key={summary.moduleId}
								label={`${summary.emoji} ${summary.label} (${summary.documentCount})`}
								active={filters.moduleId === summary.moduleId}
								onClick={() =>
									setFilters((current) => ({
										...current,
										moduleId:
											current.moduleId === summary.moduleId
												? null
												: summary.moduleId,
									}))
								}
							/>
						))}
					</div>
				</div>
			) : null}

			<div style={{ marginBottom: 14 }}>
				<DocumentSectionLabel>Category</DocumentSectionLabel>
				<div
					style={{
						display: 'flex',
						gap: 8,
						overflowX: 'auto',
						paddingTop: 10,
						scrollbarWidth: 'none',
					}}
				>
					<DocumentFilterChip
						label="All"
						active={!filters.categoryId}
						onClick={() =>
							setFilters((current) => ({ ...current, categoryId: null }))
						}
					/>
					{DOCUMENT_HOME_CATEGORIES.map((category) => {
						const count = hub.categoryCounts[category.categoryId] ?? 0

						return (
							<DocumentFilterChip
								key={category.categoryId}
								label={`${category.label}${count > 0 ? ` (${count})` : ''}`}
								active={filters.categoryId === category.categoryId}
								onClick={() =>
									setFilters((current) => ({
										...current,
										categoryId:
											current.categoryId === category.categoryId
												? null
												: category.categoryId,
									}))
								}
							/>
						)
					})}
				</div>
			</div>

			<div style={{ marginBottom: 14 }}>
				<DocumentSectionLabel>Family member</DocumentSectionLabel>
				<div
					style={{
						display: 'flex',
						gap: 8,
						overflowX: 'auto',
						paddingTop: 10,
						scrollbarWidth: 'none',
					}}
				>
					<DocumentFilterChip
						label="Everyone"
						active={!filters.familyMemberId}
						onClick={() =>
							setFilters((current) => ({
								...current,
								familyMemberId: null,
							}))
						}
					/>
					{members.map((member) => (
						<DocumentFilterChip
							key={member.id}
							label={member.displayName}
							active={filters.familyMemberId === member.id}
							onClick={() =>
								setFilters((current) => ({
									...current,
									familyMemberId:
										current.familyMemberId === member.id ? null : member.id,
								}))
							}
						/>
					))}
				</div>
			</div>

			<div style={{ marginBottom: 14 }}>
				<DocumentSectionLabel>Status</DocumentSectionLabel>
				<div
					style={{
						display: 'flex',
						gap: 8,
						overflowX: 'auto',
						paddingTop: 10,
						scrollbarWidth: 'none',
					}}
				>
					<DocumentFilterChip
						label="Any status"
						active={!filters.consumerStatus}
						onClick={() =>
							setFilters((current) => ({
								...current,
								consumerStatus: null,
							}))
						}
					/>
					{STATUS_FILTERS.map((status) => (
						<DocumentFilterChip
							key={status}
							label={status}
							active={filters.consumerStatus === status}
							onClick={() =>
								setFilters((current) => ({
									...current,
									consumerStatus:
										current.consumerStatus === status ? null : status,
								}))
							}
						/>
					))}
				</div>
			</div>

			<div style={{ marginBottom: 18 }}>
				<DocumentSectionLabel>Source & year</DocumentSectionLabel>
				<div
					style={{
						display: 'flex',
						gap: 8,
						overflowX: 'auto',
						paddingTop: 10,
						scrollbarWidth: 'none',
					}}
				>
					{SOURCE_FILTERS.map((source) => (
						<DocumentFilterChip
							key={source.id}
							label={source.label}
							active={filters.source === source.id}
							onClick={() =>
								setFilters((current) => ({
									...current,
									source: current.source === source.id ? null : source.id,
								}))
							}
						/>
					))}
					{availableYears.slice(0, 6).map((year) => (
						<DocumentFilterChip
							key={year}
							label={String(year)}
							active={filters.year === year}
							onClick={() =>
								setFilters((current) => ({
									...current,
									year: current.year === year ? null : year,
								}))
							}
						/>
					))}
				</div>
			</div>

			<div style={{ marginBottom: 12 }}>
				<DocumentSectionLabel>
					{results.length} document{results.length === 1 ? '' : 's'}
					{filteredModuleCount > 0
						? ` across ${filteredModuleCount} module${filteredModuleCount === 1 ? '' : 's'}`
						: ''}
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
					{activeFilterLabel && totalAvailable > 0 ? (
						<button
							type="button"
							onClick={() =>
								setFilters({
									...defaultLibraryFilters(),
								})
							}
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
					) : (
						<p
							style={{
								color: FC.mid,
								fontSize: 13,
								lineHeight: 1.5,
								margin: '8px 0 0',
							}}
						>
							Try a different search or connect your Google Drive folder.
						</p>
					)}
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
		</div>
	)
}
