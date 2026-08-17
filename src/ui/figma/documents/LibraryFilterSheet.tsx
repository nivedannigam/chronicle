import { SlidersHorizontal, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { DOCUMENT_HOME_CATEGORIES } from '@/features/documents/constants/document-category-display'
import type { DocumentLibraryFilters } from '@/features/documents/types/document-intelligence.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { ModuleSummary } from '@/core/platform/contracts/module-provider.contract'
import { DocumentFilterChip } from '@/ui/figma/documents/document-ui'
import { FC } from '@/ui/figma/v2/atoms'

const STATUS_FILTERS = ['Ready', 'Needs Help', 'Still Organizing'] as const

const SOURCE_FILTERS = [
	{ id: 'google-drive', label: 'Google Drive' },
	{ id: 'upload', label: 'Manual Upload' },
] as const

export function LibraryFilterButton({
	activeCount,
	onClick,
}: {
	activeCount: number
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 8,
				background: activeCount > 0 ? `${FC.blue}18` : FC.surface,
				border: `1px solid ${activeCount > 0 ? `${FC.blue}35` : FC.line}`,
				borderRadius: 100,
				padding: '9px 14px',
				cursor: 'pointer',
				fontFamily: 'inherit',
				color: activeCount > 0 ? FC.blue : FC.mid,
				fontSize: 12,
				fontWeight: 700,
				marginBottom: 16,
			}}
		>
			<SlidersHorizontal size={14} />
			Filter{activeCount > 0 ? ` (${activeCount})` : ''}
		</button>
	)
}

export function LibraryFilterSheet({
	open,
	filters,
	moduleSummaries,
	members,
	availableYears,
	onChange,
	onApply,
	onClear,
	onClose,
}: {
	open: boolean
	filters: DocumentLibraryFilters
	moduleSummaries: ModuleSummary[]
	members: FamilyMemberWithAliases[]
	availableYears: number[]
	onChange: (filters: DocumentLibraryFilters) => void
	onApply: () => void
	onClear: () => void
	onClose: () => void
}) {
	if (!open) {
		return null
	}

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 60,
				background: 'rgba(0,0,0,0.65)',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-end',
			}}
		>
			<div
				style={{
					background: FC.bg,
					borderTopLeftRadius: 24,
					borderTopRightRadius: 24,
					maxHeight: '82vh',
					overflowY: 'auto',
					padding: '18px 18px calc(18px + env(safe-area-inset-bottom))',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: 18,
					}}
				>
					<div style={{ color: FC.fg, fontSize: 18, fontWeight: 800 }}>
						Filter documents
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							color: FC.mid,
							cursor: 'pointer',
							padding: 4,
						}}
					>
						<X size={18} />
					</button>
				</div>

				<FilterSection title="Module">
					<DocumentFilterChip
						label="All modules"
						active={!filters.moduleId}
						onClick={() => onChange({ ...filters, moduleId: null })}
					/>
					{moduleSummaries.map((summary) => (
						<DocumentFilterChip
							key={summary.moduleId}
							label={`${summary.emoji} ${summary.label}`}
							active={filters.moduleId === summary.moduleId}
							onClick={() =>
								onChange({
									...filters,
									moduleId:
										filters.moduleId === summary.moduleId
											? null
											: summary.moduleId,
								})
							}
						/>
					))}
				</FilterSection>

				<FilterSection title="Category">
					<DocumentFilterChip
						label="All"
						active={!filters.categoryId}
						onClick={() => onChange({ ...filters, categoryId: null })}
					/>
					{DOCUMENT_HOME_CATEGORIES.map((category) => (
						<DocumentFilterChip
							key={category.categoryId}
							label={category.label}
							active={filters.categoryId === category.categoryId}
							onClick={() =>
								onChange({
									...filters,
									categoryId:
										filters.categoryId === category.categoryId
											? null
											: category.categoryId,
								})
							}
						/>
					))}
				</FilterSection>

				<FilterSection title="Family member">
					<DocumentFilterChip
						label="Everyone"
						active={!filters.familyMemberId}
						onClick={() => onChange({ ...filters, familyMemberId: null })}
					/>
					{members.map((member) => (
						<DocumentFilterChip
							key={member.id}
							label={member.displayName}
							active={filters.familyMemberId === member.id}
							onClick={() =>
								onChange({
									...filters,
									familyMemberId:
										filters.familyMemberId === member.id ? null : member.id,
								})
							}
						/>
					))}
				</FilterSection>

				<FilterSection title="Status">
					<DocumentFilterChip
						label="Any status"
						active={!filters.consumerStatus}
						onClick={() => onChange({ ...filters, consumerStatus: null })}
					/>
					{STATUS_FILTERS.map((status) => (
						<DocumentFilterChip
							key={status}
							label={status}
							active={filters.consumerStatus === status}
							onClick={() =>
								onChange({
									...filters,
									consumerStatus:
										filters.consumerStatus === status ? null : status,
								})
							}
						/>
					))}
				</FilterSection>

				<FilterSection title="Source & year">
					{SOURCE_FILTERS.map((source) => (
						<DocumentFilterChip
							key={source.id}
							label={source.label}
							active={filters.source === source.id}
							onClick={() =>
								onChange({
									...filters,
									source: filters.source === source.id ? null : source.id,
								})
							}
						/>
					))}
					{availableYears.slice(0, 8).map((year) => (
						<DocumentFilterChip
							key={year}
							label={String(year)}
							active={filters.year === year}
							onClick={() =>
								onChange({
									...filters,
									year: filters.year === year ? null : year,
								})
							}
						/>
					))}
				</FilterSection>

				<div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
					<button
						type="button"
						onClick={onClear}
						style={{
							flex: 1,
							background: FC.surface,
							border: `1px solid ${FC.line}`,
							borderRadius: 100,
							padding: '12px 16px',
							color: FC.fg,
							fontSize: 13,
							fontWeight: 700,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Clear all
					</button>
					<button
						type="button"
						onClick={onApply}
						style={{
							flex: 1,
							background: FC.blue,
							border: 'none',
							borderRadius: 100,
							padding: '12px 16px',
							color: '#fff',
							fontSize: 13,
							fontWeight: 700,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Apply filters
					</button>
				</div>
			</div>
		</div>
	)
}

function FilterSection({
	title,
	children,
}: {
	title: string
	children: ReactNode
}) {
	return (
		<div style={{ marginBottom: 16 }}>
			<div
				style={{
					color: FC.dim,
					fontSize: 11,
					fontWeight: 700,
					textTransform: 'uppercase',
					letterSpacing: '0.08em',
					marginBottom: 10,
				}}
			>
				{title}
			</div>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
				{children}
			</div>
		</div>
	)
}

function countActiveFilters(filters: DocumentLibraryFilters): number {
	let count = 0

	if (filters.moduleId) count += 1
	if (filters.categoryId) count += 1
	if (filters.familyMemberId) count += 1
	if (filters.consumerStatus) count += 1
	if (filters.source) count += 1
	if (filters.year) count += 1

	return count
}

export { countActiveFilters }
