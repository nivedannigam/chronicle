import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { useHealthContext } from '@/features/health/context/HealthContext'
import { findHealthVisit } from '@/features/health/services/health-visit.mapper'
import { buildVisitDoctorNotes } from '@/features/health/services/health-visit.mapper'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { buildProductReportCard } from '@/features/health/services/health-product.mapper'
import {
	FigmaHealthVisitDetailView,
	type VisitResultMetric,
} from '@/ui/figma/health/FigmaHealthVisitDetailView'
import { FC } from '@/ui/figma/v2/atoms'

const IMPORTANT_STATUSES = new Set(['low', 'high', 'critical', 'borderline'])

function buildVisitResults(
	reportIds: string[],
	reports: ReturnType<typeof useHealthContext>['reports'],
): VisitResultMetric[] {
	const reportMap = new Map(reports.map((report) => [report.id, report]))
	const results: VisitResultMetric[] = []

	for (const reportId of reportIds) {
		const report = reportMap.get(reportId)
		if (!report) {
			continue
		}

		const parsed = getParsedHealthReport(report)
		const card = buildProductReportCard(report)

		for (const metric of parsed?.metrics ?? []) {
			if (!IMPORTANT_STATUSES.has(metric.status)) {
				continue
			}

			results.push({
				id: `${reportId}-${metric.canonicalId ?? metric.displayName}`,
				name: metric.displayName,
				value: `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`,
				statusLabel:
					metric.status === 'low'
						? 'Below range'
						: metric.status === 'high'
							? 'Above range'
							: metric.status === 'critical'
								? 'Critical'
								: 'Borderline',
				reportTitle: card.title,
			})
		}
	}

	return results.slice(0, 12)
}

export function HealthVisitDetailPage() {
	const { visitId } = useParams<{ visitId: string }>()
	const navigate = useNavigate()
	const { visits, reports, visitChanges, isLoading, isError, refetch } =
		useHealthContext()

	const visit = useMemo(
		() => findHealthVisit(visits, visitId),
		[visits, visitId],
	)
	const results = useMemo(
		() => (visit ? buildVisitResults(visit.reportIds, reports) : []),
		[visit, reports],
	)
	const changes = visit ? (visitChanges[visit.id] ?? []) : []
	const doctorNotes = useMemo(() => {
		if (!visit) {
			return null
		}

		return buildVisitDoctorNotes(
			visit,
			reports.map((report) => ({
				id: report.id,
				parsed: getParsedHealthReport(report),
			})),
		)
	}, [visit, reports])

	if (isLoading) {
		return <ListSkeleton rows={5} />
	}

	if (isError) {
		return (
			<InlineErrorBanner
				message="Could not load this health visit."
				onRetry={() => void refetch()}
			/>
		)
	}

	if (!visit) {
		return <Navigate to={ROUTES.healthHistory} replace />
	}

	return (
		<div style={{ paddingBottom: 24 }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.healthHistory)}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					color: FC.mid,
					fontSize: 13,
					fontWeight: 600,
					cursor: 'pointer',
					padding: 0,
					marginBottom: 18,
					fontFamily: 'inherit',
				}}
			>
				<ArrowLeft size={15} />
				Health history
			</button>
			<FigmaHealthVisitDetailView
				visit={visit}
				results={results}
				changes={changes}
				doctorNotes={doctorNotes}
			/>
		</div>
	)
}
