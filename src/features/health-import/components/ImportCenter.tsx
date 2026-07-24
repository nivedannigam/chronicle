import { useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { C } from '@/constants/colors'
import { IMPORT_QUEUE_LABELS } from '@/core/connectors'
import { ImportProgressList } from '@/features/health-import/components/ImportProgressList'
import { formatDuration } from '@/features/health-import/services/import-summary.service'
import { useHealthImport } from '@/features/health-import/hooks/useHealthImport'
import { reprocessAllHealthReports } from '@/features/health/services/health-processing.service'
import { queryClient } from '@/lib/query-client'
import { uploadedHealthReportsQueryKey } from '@/features/health/hooks/useUploadedHealthReports'

interface ImportCenterProps {
	userId: string
}

export function ImportCenter({ userId }: ImportCenterProps) {
	const importState = useHealthImport(userId)
	const [isReprocessing, setIsReprocessing] = useState(false)
	const [reprocessMessage, setReprocessMessage] = useState<string | null>(null)
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

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
					<Bucket
						label="Failed"
						value={importState.buckets.failed}
						color={C.red}
					/>
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
					disabled={isReprocessing || importState.isRunning}
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
