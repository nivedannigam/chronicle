import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { C } from '@/constants/colors'
import { healthMetricPath, healthReportPath, ROUTES } from '@/constants/routes'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { useHealthKnowledge } from '@/features/health-knowledge/hooks/useHealthKnowledge'
import { getHealthKnowledgeCacheStats } from '@/features/health-knowledge/services/health-knowledge-cache'
import { sectionLabelStyle } from '@/features/health/types'

function DebugSection({
	title,
	children,
}: {
	title: string
	children: React.ReactNode
}) {
	return (
		<section style={{ marginBottom: 28 }}>
			<div style={sectionLabelStyle}>{title}</div>
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 14,
					padding: 14,
				}}
			>
				{children}
			</div>
		</section>
	)
}

export function HealthKnowledgeDebugPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const uploadedQuery = useUploadedHealthReports(user?.id)
	const { graph, profile } = useHealthKnowledge(
		user?.id,
		uploadedQuery.data ?? [],
	)
	const cacheStats = getHealthKnowledgeCacheStats()

	return (
		<>
			<div style={{ marginBottom: 18 }}>
				<button
					type="button"
					onClick={() => navigate(ROUTES.health)}
					style={{
						background: 'none',
						border: 'none',
						color: C.textSec,
						cursor: 'pointer',
						padding: 0,
						fontFamily: 'inherit',
						fontSize: 13,
					}}
				>
					← Back to Health
				</button>
			</div>

			<HealthSectionHeader title="Knowledge Graph Debug" />
			<div
				style={{
					fontSize: 13,
					color: C.textSec,
					marginBottom: 22,
					lineHeight: 1.5,
				}}
			>
				Deterministic health knowledge graph built from merged mock and uploaded
				reports. Generated once and cached until report data changes.
			</div>

			<DebugSection title="Graph Meta">
				<div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.7 }}>
					<div>Person ID: {profile.personId}</div>
					<div>Generated: {new Date(profile.generatedAt).toLocaleString()}</div>
					<div>Cache version: {profile.cacheVersion}</div>
					<div>Linked reports: {profile.reportIds.length}</div>
					<div>Metric histories: {profile.metricHistories.length}</div>
					<div>Relationships: {profile.relationships.length}</div>
					<div>Cache entries: {cacheStats.entryCount}</div>
				</div>
			</DebugSection>

			<DebugSection title="Categories">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{profile.categories.map((category) => (
						<div
							key={category.categoryId}
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								gap: 12,
								fontSize: 12,
								color: C.text,
							}}
						>
							<span>
								{category.emoji} {category.name}
							</span>
							<span style={{ color: C.textMuted }}>
								{category.metricCount} metrics · {category.historyCount}{' '}
								readings · {category.trend}
							</span>
						</div>
					))}
				</div>
			</DebugSection>

			<DebugSection title="All Metrics">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{profile.metricHistories.map((history) => (
						<button
							key={history.canonicalMetricId}
							type="button"
							onClick={() =>
								navigate(healthMetricPath(history.canonicalMetricId))
							}
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								gap: 12,
								background: 'none',
								border: 'none',
								padding: 0,
								cursor: 'pointer',
								textAlign: 'left',
								fontFamily: 'inherit',
							}}
						>
							<span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
								{history.displayName}
							</span>
							<span style={{ fontSize: 11, color: C.textMuted }}>
								{history.observations.length} pts · {history.trend.direction} ·{' '}
								{history.baseline.latestValueLabel}
							</span>
						</button>
					))}
				</div>
			</DebugSection>

			<DebugSection title="Relationships">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{profile.relationships.map((relationship) => (
						<div
							key={relationship.id}
							style={{ fontSize: 12, color: C.textSec }}
						>
							{relationship.fromMetricId} → {relationship.toMetricId} (
							{relationship.relationshipType}) — {relationship.label}
						</div>
					))}
				</div>
			</DebugSection>

			<DebugSection title="Normalization">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{graph.metricDefinitions.slice(0, 12).map((definition) => (
						<div
							key={definition.canonicalId}
							style={{ fontSize: 12, color: C.textSec }}
						>
							{definition.canonicalId} = {definition.displayName} ·{' '}
							{definition.categoryId} · aliases: {definition.aliases.join(', ')}
						</div>
					))}
					<div style={{ fontSize: 11, color: C.textMuted }}>
						Showing 12 of {graph.metricDefinitions.length} definitions
					</div>
				</div>
			</DebugSection>

			<DebugSection title="Linked Reports">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{profile.reportIds.map((reportId) => (
						<button
							key={reportId}
							type="button"
							onClick={() => navigate(healthReportPath(reportId))}
							style={{
								background: 'none',
								border: 'none',
								padding: 0,
								cursor: 'pointer',
								textAlign: 'left',
								color: C.accentBlue,
								fontFamily: 'inherit',
								fontSize: 12,
							}}
						>
							{reportId}
						</button>
					))}
				</div>
			</DebugSection>
		</>
	)
}
