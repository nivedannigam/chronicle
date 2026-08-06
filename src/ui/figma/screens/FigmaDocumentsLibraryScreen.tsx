import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { DOCUMENT_HOME_CATEGORIES } from '@/features/documents/constants/document-category-display'
import { useDocumentsContext } from '@/features/documents/context/DocumentsContext'
import {
	defaultLibraryFilters,
	filterDocumentLibrary,
} from '@/features/documents/services/document-library.service'
import type { DocumentConsumerStatus } from '@/features/documents/types/document-intelligence.types'
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

export function FigmaDocumentsLibraryScreen() {
	const navigate = useNavigate()
	const { members } = useFamilyContext()
	const { documents, hub, memberNames, availableYears, isLoading } =
		useDocumentsContext()
	const [filters, setFilters] = useState(defaultLibraryFilters)

	const results = useMemo(
		() =>
			filterDocumentLibrary(documents, hub.allDocuments, filters, memberNames),
		[documents, filters, hub.allDocuments, memberNames],
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
					{DOCUMENT_HOME_CATEGORIES.map((category) => (
						<DocumentFilterChip
							key={category.categoryId}
							label={category.label}
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
					))}
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
				</DocumentSectionLabel>
			</div>

			{results.length === 0 ? (
				<p style={{ color: FC.mid, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
					No documents match your filters. Try a different search or connect
					your Google Drive folder.
				</p>
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
