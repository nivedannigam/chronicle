import { useMemo, useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { healthReportPath, ROUTES } from '@/constants/routes'
import { ReportStatusBadge } from '@/features/health/components/ReportStatusBadge'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSetupGuide } from '@/features/health/components/HealthSetupGuide'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import {
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
	formatReportTypeLabel,
} from '@/features/health/services/health-parsed-report.service'

const STATUS_FILTERS = [
	{ value: 'all', label: 'All' },
	{ value: 'completed', label: 'Imported' },
	{ value: 'failed', label: 'Failed' },
	{ value: 'processing', label: 'Processing' },
] as const

type StatusFilter = (typeof STATUS_FILTERS)[number]['value']

function reportSourceLabel(report: {
	source?: string
	external_file_id?: string | null
}): string {
	if (report.source === 'google-drive' || report.external_file_id) {
		return 'Google Drive'
	}

	return 'Manual upload'
}

export function HealthReportsPage() {
	const navigate = useNavigate()
	const uploadedQuery = useMemberHealthReports()
	const reports = uploadedQuery.data ?? []
	const [query, setQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
	const [categoryFilter, setCategoryFilter] = useState('all')

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

		return reports.filter((report) => {
			const parsed = getParsedHealthReport(report)
			const title = getReportDisplayTitle(report).toLowerCase()
			const lab = (parsed?.metadata.laboratory ?? '').toLowerCase()
			const doctor = (parsed?.metadata.doctorName ?? '').toLowerCase()
			const fileName = report.file_name.toLowerCase()

			if (statusFilter !== 'all') {
				if (statusFilter === 'processing') {
					if (report.status === 'completed' || report.status === 'failed') {
						return false
					}
				} else if (report.status !== statusFilter) {
					return false
				}
			}

			if (
				categoryFilter !== 'all' &&
				parsed?.metadata.reportType !== categoryFilter
			) {
				return false
			}

			if (!normalizedQuery) {
				return true
			}

			return (
				title.includes(normalizedQuery) ||
				lab.includes(normalizedQuery) ||
				doctor.includes(normalizedQuery) ||
				fileName.includes(normalizedQuery)
			)
		})
	}, [reports, query, statusFilter, categoryFilter])

	if (uploadedQuery.isLoading) {
		return (
			<DashboardEmptyState title="Loading reports…" message="" emoji="📄" />
		)
	}

	if (uploadedQuery.isError) {
		return (
			<DashboardEmptyState
				title="Reports unavailable"
				message="We couldn't load your reports. Pull to refresh or try again shortly."
				emoji="📄"
				actionLabel="Try again"
				onAction={() => void uploadedQuery.refetch()}
			/>
		)
	}

	if (reports.length === 0) {
		return (
			<>
				<HealthSetupGuide compact />
				<DashboardEmptyState
					title="No reports yet"
					message="Connect Google Drive to bring medical reports into Health."
					emoji="📄"
					actionLabel="Open Health settings"
					onAction={() => navigate(ROUTES.healthSettings)}
				/>
			</>
		)
	}

	return (
		<>
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
					placeholder="Search reports, hospital, doctor…"
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

			<div
				style={{
					display: 'flex',
					gap: 8,
					overflowX: 'auto',
					marginBottom: 10,
					scrollbarWidth: 'none',
				}}
			>
				{STATUS_FILTERS.map((filter) => (
					<button
						key={filter.value}
						type="button"
						onClick={() => setStatusFilter(filter.value)}
						style={{
							flexShrink: 0,
							background: statusFilter === filter.value ? C.accent : C.card,
							border:
								statusFilter === filter.value
									? 'none'
									: `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '6px 12px',
							fontSize: 12,
							fontWeight: 700,
							color: statusFilter === filter.value ? C.white : C.textSec,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						{filter.label}
					</button>
				))}
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
								background:
									categoryFilter === category ? C.card2 : 'transparent',
								border: `1px solid ${C.border}`,
								borderRadius: 100,
								padding: '6px 12px',
								fontSize: 12,
								fontWeight: 600,
								color: C.textSec,
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							{category === 'all'
								? 'All categories'
								: formatReportTypeLabel(category)}
						</button>
					))}
				</div>
			) : null}

			{filteredReports.length === 0 ? (
				<DashboardEmptyState
					title="No matching reports"
					message="Try a different search or filter."
					emoji="🔍"
				/>
			) : (
				<div style={{ display: 'grid', gap: 10 }}>
					{filteredReports.map((report) => {
						const parsed = getParsedHealthReport(report)
						const title = getReportDisplayTitle(report)
						const date = getReportDisplayDate(report, parsed)
						const lab = parsed?.metadata.laboratory ?? 'Unknown lab'
						const doctor = parsed?.metadata.doctorName
						const category = parsed
							? formatReportTypeLabel(parsed.metadata.reportType)
							: 'General'
						const source = reportSourceLabel(report)

						return (
							<button
								key={report.id}
								type="button"
								onClick={() => navigate(healthReportPath(report.id))}
								style={{
									background: C.card,
									border: `1px solid ${C.border}`,
									borderRadius: 16,
									padding: '14px 16px',
									display: 'flex',
									alignItems: 'center',
									gap: 12,
									cursor: 'pointer',
									fontFamily: 'inherit',
									textAlign: 'left',
									width: '100%',
								}}
							>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontSize: 11,
											color: C.textMuted,
											marginBottom: 4,
											fontWeight: 600,
										}}
									>
										{date} · {category}
									</div>
									<div
										style={{
											fontSize: 15,
											fontWeight: 600,
											color: C.text,
											marginBottom: 4,
										}}
									>
										{title}
									</div>
									<div
										style={{ fontSize: 12, color: C.textSec, marginBottom: 8 }}
									>
										{lab}
										{doctor ? ` · Dr. ${doctor}` : ''}
									</div>
									<div
										style={{
											display: 'flex',
											gap: 6,
											flexWrap: 'wrap',
											alignItems: 'center',
										}}
									>
										<ReportStatusBadge status={report.status} />
										<span
											style={{
												fontSize: 11,
												color: C.textMuted,
												background: C.card2,
												borderRadius: 100,
												padding: '3px 9px',
											}}
										>
											{source}
										</span>
									</div>
								</div>
								<ChevronRight size={18} color={C.textMuted} />
							</button>
						)
					})}
				</div>
			)}
		</>
	)
}
