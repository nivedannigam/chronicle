import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { getImportDebugTimings } from '@/features/health-import/services/health-import-runner.service'
import { getPipelineStageLogs } from '@/features/health/pipeline/health-pipeline-logger'
import { getDriveApiDebugLog } from '@/features/connectors/google-drive/services/google-drive-api.service'
import { useEffect, useMemo, useState } from 'react'
import type { ConnectorDocumentRecord } from '@/core/connectors'
import { IMPORT_QUEUE_LABELS } from '@/core/connectors'

export function ImportDebugPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const [registry, setRegistry] = useState<ConnectorDocumentRecord[]>([])

	useEffect(() => {
		if (!user?.id) {
			return
		}

		void listRegistryRecords(user.id, 'google-drive').then(setRegistry)
	}, [user?.id])

	const failureGroups = useMemo(() => {
		const groups = new Map<string, number>()

		for (const record of registry) {
			if (record.importStatus !== 'failed' || !record.errorMessage) {
				continue
			}

			groups.set(
				record.errorMessage,
				(groups.get(record.errorMessage) ?? 0) + 1,
			)
		}

		return [...groups.entries()].sort((a, b) => b[1] - a[1])
	}, [registry])

	if (!import.meta.env.DEV) {
		return null
	}

	const timings = getImportDebugTimings()
	const pipelineLogs = getPipelineStageLogs()
	const driveLogs = getDriveApiDebugLog()

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.healthImport)}
				style={{
					background: 'none',
					border: 'none',
					color: C.textSec,
					cursor: 'pointer',
					padding: 0,
					marginBottom: 16,
					fontFamily: 'inherit',
					fontSize: 13,
				}}
			>
				← Back to Import Center
			</button>

			<div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
				Import Debug
			</div>

			<button
				type="button"
				onClick={() => navigate(ROUTES.healthImportReview)}
				style={{
					background: C.accentDim,
					border: '1px solid rgba(108,111,255,0.25)',
					borderRadius: 100,
					padding: '8px 12px',
					fontSize: 12,
					fontWeight: 700,
					color: C.accent,
					cursor: 'pointer',
					fontFamily: 'inherit',
					marginBottom: 16,
				}}
			>
				Open Review & Import Reports
			</button>

			<div
				style={{
					background: C.card,
					border: `1px solid ${C.orange}44`,
					borderRadius: 18,
					padding: 16,
					fontSize: 12,
					color: C.textSec,
					lineHeight: 1.6,
				}}
			>
				<div style={{ marginBottom: 12 }}>
					<strong style={{ color: C.text }}>
						Registry ({registry.length})
					</strong>
					{registry.map((record) => (
						<div
							key={record.id}
							style={{
								marginTop: 8,
								paddingTop: 8,
								borderTop: `1px solid ${C.border}`,
							}}
						>
							<div style={{ color: C.text, fontWeight: 700 }}>
								{record.fileName}
							</div>
							<div>
								Status: {IMPORT_QUEUE_LABELS[record.importStatus]} · Approval:{' '}
								{record.approvalStatus ?? 'unknown'} · Category:{' '}
								{record.discoveryCategory ?? 'unknown'}
							</div>
							{record.errorMessage ? (
								<div style={{ color: C.red, marginTop: 4 }}>
									{record.errorMessage}
								</div>
							) : null}
						</div>
					))}
				</div>

				<div style={{ marginBottom: 12 }}>
					<strong style={{ color: C.text }}>Failure Groups</strong>
					{failureGroups.length === 0 ? (
						<div>No failed imports.</div>
					) : (
						failureGroups.map(([message, count]) => (
							<div key={message}>
								{count}× {message}
							</div>
						))
					)}
				</div>

				<div style={{ marginBottom: 12 }}>
					<strong style={{ color: C.text }}>Pipeline Stage Log</strong>
					{pipelineLogs.length === 0 ? (
						<div>No pipeline stages recorded yet.</div>
					) : (
						pipelineLogs.map((log, index) => (
							<div
								key={`${log.stage}-${log.startedAt}-${index}`}
								style={{
									marginTop: 8,
									paddingTop: 8,
									borderTop: `1px solid ${C.border}`,
								}}
							>
								<div style={{ color: C.text, fontWeight: 700 }}>
									{log.stage}
									{log.nextStage ? ` → ${log.nextStage}` : ''}
								</div>
								<div>
									Started: {log.startedAt}
									{log.durationMs != null ? ` · ${log.durationMs}ms` : ''}
								</div>
								{log.error ? (
									<div
										style={{
											color: C.red,
											marginTop: 4,
											whiteSpace: 'pre-wrap',
										}}
									>
										{log.error}
									</div>
								) : null}
								{Object.keys(log.details).length > 0 ? (
									<pre
										style={{
											marginTop: 4,
											fontSize: 10,
											whiteSpace: 'pre-wrap',
											color: C.textMuted,
										}}
									>
										{JSON.stringify(log.details, null, 2)}
									</pre>
								) : null}
							</div>
						))
					)}
				</div>

				<div style={{ marginBottom: 12 }}>
					<strong style={{ color: C.text }}>Drive Edge Function Log</strong>
					{driveLogs.length === 0 ? (
						<div>No drive-connector calls yet.</div>
					) : (
						driveLogs.slice(0, 10).map((entry) => (
							<div
								key={`${entry.action}-${entry.timestamp}`}
								style={{ marginTop: 4 }}
							>
								{entry.success ? '✓' : '✗'} {entry.action} · {entry.durationMs}
								ms
								{entry.detail ? ` — ${entry.detail.slice(0, 120)}` : ''}
							</div>
						))
					)}
				</div>

				<div style={{ marginBottom: 12 }}>
					<strong style={{ color: C.text }}>Processing Times</strong>
					{timings.map((timing) => (
						<div key={timing.registryId}>
							{timing.registryId.slice(0, 8)}… · {timing.elapsedMs}ms
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
