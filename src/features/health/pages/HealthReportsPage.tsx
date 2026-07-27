import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { HealthReportRecordCard } from '@/features/health/components/companion/HealthReportRecordCard'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthMemberCopy } from '@/features/health/hooks/useHealthMemberCopy'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import {
	buildReportSummaries,
	scoreReportSearchRelevance,
} from '@/features/health/services/health-companion.service'
import {
	formatReportTypeLabel,
	getParsedHealthReport,
} from '@/features/health/services/health-parsed-report.service'
import {
	HealthFilterChip,
	HealthPageIntro,
	HealthSearchField,
} from '@/ui/figma/health/health-ui'

export function HealthReportsPage() {
	const navigate = useNavigate()
	const memberCopy = useHealthMemberCopy()
	const { reports, hasImportedReports, isLoading, isError, refetch } =
		useHealthCompanion()
	const [query, setQuery] = useState('')
	const [categoryFilter, setCategoryFilter] = useState('all')

	const summaries = useMemo(() => buildReportSummaries(reports), [reports])

	const categories = useMemo(() => {
		const values = new Set<string>()

		for (const report of reports) {
			const parsed = getParsedHealthReport(report)

			if (parsed?.metadata.reportType) {
				values.add(parsed.metadata.reportType)
			}
		}

		return ['all', ...values]
	}, [reports])

	const filteredReports = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase()

		return summaries
			.map((summary) => {
				const source = reports.find((report) => report.id === summary.id)

				return {
					summary,
					relevance: source
						? scoreReportSearchRelevance(source, normalizedQuery)
						: 0,
				}
			})
			.filter(({ summary, relevance }) => {
				if (categoryFilter !== 'all') {
					const source = reports.find((report) => report.id === summary.id)
					const parsed = source ? getParsedHealthReport(source) : null

					if (parsed?.metadata.reportType !== categoryFilter) {
						return false
					}
				}

				if (!normalizedQuery) {
					return true
				}

				const haystack = [
					summary.title,
					summary.hospital,
					summary.doctor ?? '',
					...summary.findings,
				]
					.join(' ')
					.toLowerCase()

				return haystack.includes(normalizedQuery) || relevance > 0
			})
			.sort((left, right) => {
				if (normalizedQuery) {
					return right.relevance - left.relevance
				}

				return Date.parse(right.summary.date) - Date.parse(left.summary.date)
			})
			.map(({ summary }) => summary)
	}, [summaries, reports, query, categoryFilter])

	if (isLoading) {
		return <ListSkeleton rows={4} />
	}

	if (isError) {
		return (
			<InlineErrorBanner
				message="Could not load your medical records."
				onRetry={() => void refetch()}
			/>
		)
	}

	if (!hasImportedReports) {
		return (
			<>
				<DashboardEmptyState
					title="No medical records yet"
					message="Add health reports and Chronicle will organize them like a personal medical file."
					emoji="📋"
					actionLabel={HEALTH_COPY.emptyAddReports}
					onAction={() => navigate(ROUTES.healthSettings)}
				/>
			</>
		)
	}

	return (
		<>
			<HealthPageIntro>
				{memberCopy.possessive} medical records — organized by visit, not by
				upload history.
			</HealthPageIntro>

			<HealthSearchField
				value={query}
				onChange={setQuery}
				placeholder="Search liver, hospital, doctor…"
				ariaLabel="Search medical records"
			/>

			{categories.length > 1 ? (
				<div
					style={{
						display: 'flex',
						gap: 8,
						overflowX: 'auto',
						marginBottom: 16,
						scrollbarWidth: 'none',
					}}
				>
					{categories.map((category) => (
						<HealthFilterChip
							key={category}
							label={
								category === 'all'
									? 'All visits'
									: formatReportTypeLabel(category)
							}
							active={categoryFilter === category}
							onClick={() => setCategoryFilter(category)}
						/>
					))}
				</div>
			) : null}

			{filteredReports.length === 0 ? (
				<DashboardEmptyState
					title="No matching records"
					message="Try searching for a body area like liver, or a hospital name."
					emoji="🔍"
				/>
			) : (
				<div style={{ display: 'grid', gap: 12 }}>
					{filteredReports.map((report) => (
						<HealthReportRecordCard key={report.id} report={report} />
					))}
				</div>
			)}
		</>
	)
}
