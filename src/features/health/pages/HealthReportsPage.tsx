import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { HealthReportRecordCard } from '@/features/health/components/companion/HealthReportRecordCard'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSetupGuide } from '@/features/health/components/HealthSetupGuide'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import {
	buildReportSummaries,
	scoreReportSearchRelevance,
} from '@/features/health/services/health-companion.service'
import {
	formatReportTypeLabel,
	getParsedHealthReport,
} from '@/features/health/services/health-parsed-report.service'

export function HealthReportsPage() {
	const navigate = useNavigate()
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
				<HealthSetupGuide compact />
				<DashboardEmptyState
					title="No medical records yet"
					message="Add health reports and Chronicle will organize them like a personal medical file."
					emoji="📋"
					actionLabel="Add reports"
					onAction={() => navigate(ROUTES.healthSettings)}
				/>
			</>
		)
	}

	return (
		<>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 16,
					lineHeight: 1.5,
				}}
			>
				Your medical records — organized by visit, not by upload history.
			</div>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 10,
					padding: '10px 14px',
					borderRadius: 14,
					border: `1px solid ${C.border}`,
					background: C.card,
					marginBottom: 12,
				}}
			>
				<Search size={16} color={C.textMuted} />
				<input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search liver, hospital, doctor…"
					aria-label="Search medical records"
					style={{
						flex: 1,
						background: 'transparent',
						border: 'none',
						outline: 'none',
						color: C.text,
						fontSize: 14,
						fontFamily: 'inherit',
					}}
				/>
			</div>

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
						<button
							key={category}
							type="button"
							onClick={() => setCategoryFilter(category)}
							style={{
								flexShrink: 0,
								background: categoryFilter === category ? C.accent : C.card,
								border:
									categoryFilter === category
										? 'none'
										: `1px solid ${C.border}`,
								borderRadius: 100,
								padding: '6px 12px',
								fontSize: 12,
								fontWeight: 700,
								color: categoryFilter === category ? C.white : C.textSec,
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							{category === 'all'
								? 'All visits'
								: formatReportTypeLabel(category)}
						</button>
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
