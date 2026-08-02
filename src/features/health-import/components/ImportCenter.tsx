import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { IMPORT_QUEUE_LABELS } from '@/core/connectors'
import { ImportProgressList } from '@/features/health-import/components/ImportProgressList'
import { formatDuration } from '@/features/health-import/services/import-summary.service'
import { useHealthImport } from '@/features/health-import/hooks/useHealthImport'
import { useHealthCoverage } from '@/features/health/hooks/useHealthCoverage'
import {
	listReportsEligibleForAiReprocess,
	reprocessAllHealthReports,
	reprocessFailedReportsWithAi,
} from '@/features/health/services/health-processing.service'
import { AI_BULK_REPROCESS_CONFIRMATION } from '@/features/health/services/health-ai-extraction.service'
import { groupImportFailures } from '@/features/health/services/health-coverage.service'
import { queryClient } from '@/lib/query-client'
import { uploadedHealthReportsQueryKey } from '@/features/health/hooks/useUploadedHealthReports'

interface ImportCenterProps {
	userId: string
}

export function ImportCenter({ userId }: ImportCenterProps) {
	const navigate = useNavigate()
	const importState = useHealthImport(userId)
	const coverage = useHealthCoverage()
	const [isReprocessing, setIsReprocessing] = useState(false)
	const [isAiReprocessing, setIsAiReprocessing] = useState(false)
	const [reprocessMessage, setReprocessMessage] = useState<string | null>(null)
	const [aiEligibleCount, setAiEligibleCount] = useState(0)
	const failureGroups = groupImportFailures(importState.registry)
	const failedCount = coverage.failedCount
	const currentDocs =
		importState.registry.filter(
			(r) =>
				r.importStatus !== 'completed' &&
				r.importStatus !== 'skipped' &&
				r.importStatus !== 'failed',
		) ?? []

	const completed = importState.registry.filter(
		(r) => r.importStatus === 'completed',
	)
	const failed = importState.registry.filter((r) => r.importStatus === 'failed')

	useEffect(() => {
		let cancelled = false

		void listReportsEligibleForAiReprocess(userId)
			.then((reports) => {
				if (!cancelled) {
					setAiEligibleCount(reports.length)
				}
			})
			.catch(() => {
				if (!cancelled) {
					setAiEligibleCount(0)
				}
			})

		return () => {
			cancelled = true
		}
	}, [userId, failedCount, importState.registry.length])

	const handleReprocessAll = async () => {
		const confirmed = window.confirm(
			'Reprocess all health reports with the latest parser?\n\nThis updates report titles and extracted metrics without deleting imports.',
		)

		if (!confirmed) {
			return
		}

		setIsReprocessing(true)
		setReprocessMessage(null)

		try {
			const result = await reprocessAllHealthReports(userId)
			void queryClient.invalidateQueries({
				queryKey: uploadedHealthReportsQueryKey(userId),
			})
			setReprocessMessage(
				`Reprocessed ${result.processed} report${result.processed === 1 ? '' : 's'}${result.failed > 0 ? ` (${result.failed} failed)` : ''}.`,
			)
		} catch (error) {
			setReprocessMessage(
				error instanceof Error ? error.message : 'Reprocess failed',
			)
		} finally {
			setIsReprocessing(false)
		}
	}

	const handleReprocessFailedWithAi = async () => {
		if (aiEligibleCount === 0) {
			return
		}

		const confirmed = window.confirm(
			AI_BULK_REPROCESS_CONFIRMATION(aiEligibleCount),
		)

		if (!confirmed) {
			return
		}

		setIsAiReprocessing(true)
		setReprocessMessage(null)

		try {
			const result = await reprocessFailedReportsWithAi(userId)
			void queryClient.invalidateQueries({
				queryKey: uploadedHealthReportsQueryKey(userId),
			})
			const refreshed = await listReportsEligibleForAiReprocess(userId)
			setAiEligibleCount(refreshed.length)
			setReprocessMessage(
				`AI reprocessed ${result.processed} report${result.processed === 1 ? '' : 's'}${result.failed > 0 ? ` (${result.failed} still failed)` : ''}.`,
			)
		} catch (error) {
			setReprocessMessage(
				error instanceof Error ? error.message : 'AI reprocess failed',
			)
		} finally {
			setIsAiReprocessing(false)
		}
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
			{coverage.corpusCompleteness === 'partial' ? (
				<div
					style={{
						background: `${C.orange}14`,
						border: `1px solid ${C.orange}33`,
						borderRadius: 18,
						padding: '14px 16px',
					}}
				>
					<div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
						Partial import coverage
					</div>
					<div
						style={{
							fontSize: 13,
							color: C.textSec,
							lineHeight: 1.5,
							marginTop: 6,
						}}
					>
						{coverage.summaryLine}
					</div>
					<button
						type="button"
						onClick={() => navigate(ROUTES.health)}
						style={{
							marginTop: 10,
							background: 'none',
							border: 'none',
							padding: 0,
							color: C.accentBlue,
							fontSize: 12,
							fontWeight: 700,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						View health coverage →
					</button>
				</div>
			) : null}
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					padding: 16,
				}}
			>
				<div
					style={{
						fontSize: 15,
						fontWeight: 700,
						color: C.text,
						marginBottom: 12,
					}}
				>
					Document Registry
				</div>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr 1fr',
						gap: 8,
					}}
				>
					<Bucket
						label="Imported"
						value={importState.buckets.imported}
						color={C.greenAlt}
					/>
					<Bucket
						label="Skipped"
						value={importState.buckets.skipped}
						color={C.textMuted}
					/>
					<Bucket label="Failed" value={failedCount} color={C.red} />
					<Bucket
						label="Processing"
						value={importState.buckets.processing}
						color={C.accentBlue}
					/>
					<Bucket
						label="Queued"
						value={importState.buckets.queued}
						color={C.orange}
					/>
				</div>
			</div>

			{importState.job && importState.isRunning ? (
				<Section title="Current Import">
					<ImportProgressList documents={importState.job.documents} />
				</Section>
			) : null}

			<Section title="In Progress">
				<ImportProgressList
					documents={currentDocs.map((record) => ({
						registryId: record.id,
						fileName: record.fileName,
						status: record.importStatus,
						stageLabel: IMPORT_QUEUE_LABELS[record.importStatus],
						startedAt: record.lastSyncAt ?? record.importedAt ?? '',
						elapsedMs: 0,
						errorMessage: record.errorMessage,
					}))}
				/>
			</Section>

			<Section title="Completed Imports">
				<MiniList
					items={completed.slice(0, 8).map((r) => r.fileName)}
					empty="No completed imports yet."
				/>
			</Section>

			<Section title="Failed Imports">
				{failedCount > 0 ? (
					<div
						style={{
							display: 'flex',
							flexWrap: 'wrap',
							gap: 8,
							marginBottom: 12,
						}}
					>
						{failureGroups.download > 0 ? (
							<BulkAction
								label={`Retry download failures (${failureGroups.download})`}
								onClick={() => void importState.retry()}
								disabled={importState.isRunning}
							/>
						) : null}
						{failureGroups.nonLab > 0 ? (
							<BulkAction
								label={`Skip non-lab documents (${failureGroups.nonLab})`}
								onClick={() => void importState.retry()}
								disabled={importState.isRunning}
							/>
						) : null}
						{failureGroups.noMetrics > 0 ? (
							<BulkAction
								label={`Reprocess metric-less OCR successes (${failureGroups.noMetrics})`}
								onClick={() => void handleReprocessAll()}
								disabled={
									isReprocessing || importState.isRunning || isAiReprocessing
								}
							/>
						) : null}
						{aiEligibleCount > 0 ? (
							<BulkAction
								label={`Retry failed with AI (${aiEligibleCount})`}
								onClick={() => void handleReprocessFailedWithAi()}
								disabled={
									isAiReprocessing || isReprocessing || importState.isRunning
								}
							/>
						) : null}
					</div>
				) : null}
				<MiniList
					items={failed
						.slice(0, 8)
						.map(
							(r) =>
								`${r.fileName}${r.errorMessage ? ` — ${r.errorMessage}` : ''}`,
						)}
					empty="No failed imports."
				/>
				{failed.length > 0 ? (
					<button
						type="button"
						onClick={() => void importState.retry()}
						disabled={importState.isRunning}
						style={{
							marginTop: 10,
							background: C.accent,
							border: 'none',
							borderRadius: 100,
							padding: '8px 14px',
							fontSize: 12,
							fontWeight: 700,
							color: C.white,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Retry Failed
					</button>
				) : null}
			</Section>

			<Section title="Reprocess Reports">
				<div
					style={{
						fontSize: 13,
						color: C.textSec,
						lineHeight: 1.5,
						marginBottom: 12,
					}}
				>
					After parser or OCR updates, reprocess existing reports to refresh
					titles and metrics without re-importing from Google Drive.
				</div>
				<button
					type="button"
					onClick={() => void handleReprocessAll()}
					disabled={isReprocessing || importState.isRunning || isAiReprocessing}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 8,
						background: C.accent,
						border: 'none',
						borderRadius: 100,
						padding: '8px 14px',
						fontSize: 12,
						fontWeight: 700,
						color: C.white,
						cursor: isReprocessing ? 'not-allowed' : 'pointer',
						fontFamily: 'inherit',
					}}
				>
					{isReprocessing ? (
						<Loader2
							size={14}
							style={{ animation: 'spin 1s linear infinite' }}
						/>
					) : (
						<RefreshCw size={14} />
					)}
					Reprocess all reports
				</button>
				{aiEligibleCount > 0 ? (
					<button
						type="button"
						onClick={() => void handleReprocessFailedWithAi()}
						disabled={
							isAiReprocessing || isReprocessing || importState.isRunning
						}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 8,
							background: C.card2,
							border: `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '8px 14px',
							fontSize: 12,
							fontWeight: 700,
							color: C.textSec,
							cursor: isAiReprocessing ? 'not-allowed' : 'pointer',
							fontFamily: 'inherit',
							marginTop: 10,
						}}
					>
						{isAiReprocessing ? (
							<Loader2
								size={14}
								style={{ animation: 'spin 1s linear infinite' }}
							/>
						) : (
							<Sparkles size={14} />
						)}
						Retry failed with AI ({aiEligibleCount})
					</button>
				) : null}
				{reprocessMessage ? (
					<div style={{ fontSize: 12, color: C.textSec, marginTop: 10 }}>
						{reprocessMessage}
					</div>
				) : null}
			</Section>

			<Section title="Import History">
				{importState.history.length === 0 ? (
					<div style={{ fontSize: 13, color: C.textMuted }}>
						No import history yet.
					</div>
				) : (
					importState.history.map((entry) => (
						<div
							key={entry.id}
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								gap: 12,
								padding: '8px 0',
								borderBottom: `1px solid ${C.border}`,
								fontSize: 12,
								color: C.textSec,
							}}
						>
							<span>{new Date(entry.importDate).toLocaleString()}</span>
							<span>
								+{entry.reportsAdded} · skip {entry.reportsSkipped} ·{' '}
								{formatDuration(entry.durationMs)}
							</span>
						</div>
					))
				)}
			</Section>
		</div>
	)
}

function Section({
	title,
	children,
}: {
	title: string
	children: React.ReactNode
}) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				padding: 16,
			}}
		>
			<div
				style={{
					fontSize: 15,
					fontWeight: 700,
					color: C.text,
					marginBottom: 12,
				}}
			>
				{title}
			</div>
			{children}
		</div>
	)
}

function Bucket({
	label,
	value,
	color,
}: {
	label: string
	value: number
	color: string
}) {
	return (
		<div
			style={{ background: C.card2, borderRadius: 12, padding: '10px 12px' }}
		>
			<div style={{ fontSize: 10, color: C.textMuted }}>{label}</div>
			<div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
		</div>
	)
}

function BulkAction({
	label,
	onClick,
	disabled,
}: {
	label: string
	onClick: () => void
	disabled?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				background: C.card2,
				border: `1px solid ${C.border}`,
				borderRadius: 100,
				padding: '6px 12px',
				fontSize: 11,
				fontWeight: 700,
				color: C.textSec,
				cursor: disabled ? 'not-allowed' : 'pointer',
				fontFamily: 'inherit',
			}}
		>
			{label}
		</button>
	)
}

function MiniList({ items, empty }: { items: string[]; empty: string }) {
	if (items.length === 0) {
		return <div style={{ fontSize: 13, color: C.textMuted }}>{empty}</div>
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
			{items.map((item) => (
				<div key={item} style={{ fontSize: 12, color: C.textSec }}>
					{item}
				</div>
			))}
		</div>
	)
}
