import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, FlaskConical, Pill, Stethoscope } from 'lucide-react'
import { C } from '@/constants/colors'
import { healthReportPath, ROUTES } from '@/constants/routes'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { HealthSetupGuide } from '@/features/health/components/HealthSetupGuide'
import { ReportTimeline } from '@/features/health/components/ReportTimeline'
import { useHealthMemberSetup } from '@/features/health/hooks/useHealthMemberSetup'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import {
	buildHealthTimeline,
	getTimelineDisplayDate,
} from '@/features/health/services/health-timeline.service'
import {
	getParsedHealthReport,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'

export function HealthTimelinePage() {
	const navigate = useNavigate()
	const setup = useHealthMemberSetup()
	const uploadedQuery = useMemberHealthReports()
	const uploadedReports = uploadedQuery.data ?? []

	const timelineItems = useMemo(
		() => buildHealthTimeline(uploadedReports),
		[uploadedReports],
	)

	const hasData = timelineItems.length > 0

	if (uploadedQuery.isLoading) {
		return (
			<DashboardEmptyState title="Loading timeline…" message="" emoji="📅" />
		)
	}

	if (uploadedQuery.isError) {
		return (
			<DashboardEmptyState
				title="Timeline unavailable"
				message="We couldn't load your timeline. Try again in a moment."
				emoji="📅"
				actionLabel="Try again"
				onAction={() => void uploadedQuery.refetch()}
			/>
		)
	}

	if (!hasData) {
		return (
			<>
				<HealthSetupGuide compact />
				<DashboardEmptyState
					title="No timeline events"
					message="Report imports, lab tests, and medical visits will appear here chronologically."
					emoji="📅"
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
					fontSize: 14,
					color: C.textSec,
					marginBottom: 20,
					lineHeight: 1.5,
				}}
			>
				Chronological health events for the selected family member.
			</div>

			<HealthSectionHeader title="Health Events" />
			<div style={{ marginBottom: 28 }}>
				<ReportTimeline
					items={timelineItems}
					isLoading={false}
					errorMessage={null}
				/>
			</div>

			<HealthSectionHeader title="Lab Tests" />
			<div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
				{timelineItems
					.filter((item) => item.type === 'upload')
					.map((item) => {
						const parsed = getParsedHealthReport(item.report)
						return (
							<button
								key={item.report.id}
								type="button"
								onClick={() => navigate(healthReportPath(item.report.id))}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 12,
									padding: '14px 16px',
									borderRadius: 14,
									border: `1px solid ${C.border}`,
									background: C.card,
									cursor: 'pointer',
									fontFamily: 'inherit',
									textAlign: 'left',
								}}
							>
								<FlaskConical size={18} color={C.teal} />
								<div style={{ flex: 1 }}>
									<div style={{ fontSize: 14, fontWeight: 600 }}>
										{getReportDisplayTitle(item.report)}
									</div>
									<div style={{ fontSize: 12, color: C.textMuted }}>
										{getTimelineDisplayDate(item)}
										{parsed?.metadata.laboratory
											? ` · ${parsed.metadata.laboratory}`
											: ''}
									</div>
								</div>
							</button>
						)
					})}
			</div>

			<HealthSectionHeader title="Medical Visits" />
			<DashboardEmptyState
				title="No visit records yet"
				message="Visit summaries from imported reports will appear here when available."
				emoji="🩺"
			/>

			<HealthSectionHeader title="Coming Soon" />
			<div style={{ display: 'grid', gap: 8 }}>
				{[
					{
						icon: Pill,
						label: 'Medications',
						hint: 'Track prescriptions over time',
					},
					{
						icon: Calendar,
						label: 'Appointments',
						hint: 'Upcoming and past appointments',
					},
					{
						icon: Stethoscope,
						label: 'Clinical notes',
						hint: 'Doctor visit summaries',
					},
				].map(({ icon: Icon, label, hint }) => (
					<div
						key={label}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 12,
							padding: '14px 16px',
							borderRadius: 14,
							border: `1px dashed ${C.border}`,
							background: C.card,
							opacity: 0.75,
						}}
					>
						<Icon size={18} color={C.textMuted} />
						<div>
							<div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
							<div style={{ fontSize: 12, color: C.textMuted }}>{hint}</div>
						</div>
					</div>
				))}
			</div>

			{setup.needsReview > 0 ? (
				<button
					type="button"
					onClick={() => navigate(ROUTES.healthImportReview)}
					style={{
						width: '100%',
						marginTop: 20,
						background: C.accentDim,
						border: `1px solid ${C.accent}44`,
						borderRadius: 14,
						padding: '12px 16px',
						fontSize: 14,
						fontWeight: 700,
						color: C.accent,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					Review {setup.needsReview} pending import
					{setup.needsReview === 1 ? '' : 's'}
				</button>
			) : null}
		</>
	)
}
