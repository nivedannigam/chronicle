import { useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { SetupReportRow } from '@/features/health-import/components/SetupReportRow'
import { useHealthImport } from '@/features/health-import/hooks/useHealthImport'
import type { SetupReportListFilter } from '@/features/health-import/types/setup-report-list.types'
import {
	applySetupListVisibility,
	buildSetupReportRows,
	countSetupRowsByFilter,
} from '@/features/health-import/utils/setup-report-list.utils'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import {
	AI_BULK_REPROCESS_CONFIRMATION,
	AI_REPROCESS_CONFIRMATION,
} from '@/features/health/services/health-ai-extraction.service'
import {
	listReportsEligibleForAiReprocess,
	reprocessAllHealthReports,
	reprocessFailedReportsWithAi,
	reprocessHealthReport,
	reprocessHealthReportWithAi,
} from '@/features/health/services/health-processing.service'
import { retryFailedWorkflowItem } from '@/features/health/workflow/health-workflow-retry.service'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import { queryClient } from '@/lib/query-client'
import { uploadedHealthReportsQueryKey } from '@/features/health/hooks/useUploadedHealthReports'
import { HealthFilterChip } from '@/ui/figma/health/health-ui'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

interface HealthImportReportListProps {
	userId: string
}

export function HealthImportReportList({
	userId,
}: HealthImportReportListProps) {
	const importState = useHealthImport(userId)
	const { data: reports = [] } = useMemberHealthReports()
	const { selectedMemberId, accountOwnerMemberId } = useFamilyContext()
	const [filter, setFilter] = useState<SetupReportListFilter>('needs_attention')
	const [showDuplicates, setShowDuplicates] = useState(false)
	const [busyRowKey, setBusyRowKey] = useState<string | null>(null)
	const [isBulkRetrying, setIsBulkRetrying] = useState(false)
	const [isBulkReprocessing, setIsBulkReprocessing] = useState(false)
	const [isBulkAiReprocessing, setIsBulkAiReprocessing] = useState(false)
	const [bulkMessage, setBulkMessage] = useState<string | null>(null)
	const [aiEligibleCount, setAiEligibleCount] = useState(0)

	const rows = useMemo(
		() =>
			buildSetupReportRows({
				registry: importState.registry,
				reports,
				memberId: selectedMemberId,
				accountOwnerMemberId,
			}),
		[importState.registry, reports, selectedMemberId, accountOwnerMemberId],
	)

	const filteredRows = useMemo(
		() => applySetupListVisibility(rows, filter, showDuplicates),
		[rows, filter, showDuplicates],
	)

	const counts = useMemo(() => countSetupRowsByFilter(rows), [rows])

	const isBulkBusy =
		isBulkRetrying ||
		isBulkReprocessing ||
		isBulkAiReprocessing ||
		importState.isRunning

	useEffect(() => {
		let cancelled = false

		void listReportsEligibleForAiReprocess(userId)
			.then((eligible) => {
				if (!cancelled) {
					setAiEligibleCount(eligible.length)
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
	}, [userId, rows.length])

	const refreshQueries = async () => {
		await Promise.all([
			importState.refresh(),
			queryClient.invalidateQueries({
				queryKey: uploadedHealthReportsQueryKey(userId),
			}),
			invalidateAfterHealthImport(userId),
		])
		const eligible = await listReportsEligibleForAiReprocess(userId)
		setAiEligibleCount(eligible.length)
	}

	const handleBulkRetryFailed = async () => {
		setIsBulkRetrying(true)
		setBulkMessage(null)

		try {
			await importState.retry()
			await refreshQueries()
			setBulkMessage('Retried failed imports.')
		} catch (error) {
			setBulkMessage(
				error instanceof Error ? error.message : 'Retry failed imports failed.',
			)
		} finally {
			setIsBulkRetrying(false)
		}
	}

	const handleBulkReprocessAll = async () => {
		const confirmed = window.confirm(
			'Reprocess all health reports with the latest parser?\n\nThis updates report titles and extracted metrics without deleting imports.',
		)

		if (!confirmed) {
			return
		}

		setIsBulkReprocessing(true)
		setBulkMessage(null)

		try {
			const result = await reprocessAllHealthReports(userId)
			await refreshQueries()
			setBulkMessage(
				`Reprocessed ${result.processed} report${result.processed === 1 ? '' : 's'}${result.failed > 0 ? ` (${result.failed} failed)` : ''}.`,
			)
		} catch (error) {
			setBulkMessage(
				error instanceof Error ? error.message : 'Reprocess all failed.',
			)
		} finally {
			setIsBulkReprocessing(false)
		}
	}

	const handleBulkAiReprocess = async () => {
		if (aiEligibleCount === 0) {
			return
		}

		const confirmed = window.confirm(
			AI_BULK_REPROCESS_CONFIRMATION(aiEligibleCount),
		)

		if (!confirmed) {
			return
		}

		setIsBulkAiReprocessing(true)
		setBulkMessage(null)

		try {
			const result = await reprocessFailedReportsWithAi(userId)
			await refreshQueries()
			setBulkMessage(
				`AI reprocessed ${result.processed} report${result.processed === 1 ? '' : 's'}${result.failed > 0 ? ` (${result.failed} still failed)` : ''}.`,
			)
		} catch (error) {
			setBulkMessage(
				error instanceof Error ? error.message : 'AI reprocess failed.',
			)
		} finally {
			setIsBulkAiReprocessing(false)
		}
	}

	const handleRowReimport = async (row: (typeof rows)[number]) => {
		setBusyRowKey(row.key)
		setBulkMessage(null)

		try {
			if (row.registryId) {
				await retryFailedWorkflowItem(userId, row.registryId)
			} else if (row.reportId) {
				await reprocessHealthReport(row.reportId)
			} else {
				return
			}

			await refreshQueries()
		} catch (error) {
			setBulkMessage(
				error instanceof Error ? error.message : 'Reimport failed.',
			)
		} finally {
			setBusyRowKey(null)
		}
	}

	const handleRowReprocess = async (row: (typeof rows)[number]) => {
		if (!row.reportId) {
			return
		}

		setBusyRowKey(row.key)
		setBulkMessage(null)

		try {
			await reprocessHealthReport(row.reportId)
			await refreshQueries()
		} catch (error) {
			setBulkMessage(
				error instanceof Error ? error.message : 'Reprocess failed.',
			)
		} finally {
			setBusyRowKey(null)
		}
	}

	const handleRowReprocessWithAi = async (row: (typeof rows)[number]) => {
		if (!row.reportId || !row.canReprocessWithAi) {
			return
		}

		const confirmed = window.confirm(AI_REPROCESS_CONFIRMATION)

		if (!confirmed) {
			return
		}

		setBusyRowKey(row.key)
		setBulkMessage(null)

		try {
			await reprocessHealthReportWithAi(row.reportId)
			await refreshQueries()
		} catch (error) {
			setBulkMessage(
				error instanceof Error ? error.message : 'AI reprocess failed.',
			)
		} finally {
			setBusyRowKey(null)
		}
	}

	const showBulkBar =
		counts.failed > 0 || rows.some((row) => row.status === 'needs_reprocess')

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			{showBulkBar ? (
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 16,
						padding: '12px 14px',
						display: 'flex',
						flexDirection: 'column',
						gap: 10,
					}}
				>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
						{counts.failed > 0 ? (
							<BulkButton
								label={
									isBulkRetrying
										? 'Retrying…'
										: `Retry all failed (${counts.failed})`
								}
								onClick={() => void handleBulkRetryFailed()}
								disabled={isBulkBusy}
								busy={isBulkRetrying}
							/>
						) : null}
						<BulkButton
							label={isBulkReprocessing ? 'Reprocessing…' : 'Reprocess all'}
							onClick={() => void handleBulkReprocessAll()}
							disabled={isBulkBusy}
							busy={isBulkReprocessing}
							icon={RefreshCw}
						/>
						{aiEligibleCount > 0 ? (
							<BulkButton
								label={
									isBulkAiReprocessing
										? 'AI…'
										: `Retry failed with AI (${aiEligibleCount})`
								}
								onClick={() => void handleBulkAiReprocess()}
								disabled={isBulkBusy}
								busy={isBulkAiReprocessing}
								icon={Sparkles}
							/>
						) : null}
					</div>
					{bulkMessage ? (
						<p style={{ color: FC.mid, fontSize: 12, margin: 0 }}>
							{bulkMessage}
						</p>
					) : null}
				</div>
			) : null}

			<div
				style={{ display: 'flex', gap: 8, overflowX: 'auto', flexWrap: 'wrap' }}
			>
				<HealthFilterChip
					label={`All (${counts.all - (showDuplicates ? 0 : counts.skipped)})`}
					active={filter === 'all'}
					onClick={() => setFilter('all')}
				/>
				<HealthFilterChip
					label={`Needs attention (${counts.needsAttention})`}
					active={filter === 'needs_attention'}
					onClick={() => setFilter('needs_attention')}
				/>
				<HealthFilterChip
					label={`Ready (${counts.ready})`}
					active={filter === 'ready'}
					onClick={() => setFilter('ready')}
				/>
				{counts.skipped > 0 ? (
					<HealthFilterChip
						label={
							showDuplicates
								? `Hide duplicates (${counts.skipped})`
								: `Show duplicates (${counts.skipped})`
						}
						active={showDuplicates}
						onClick={() => setShowDuplicates((open) => !open)}
					/>
				) : null}
			</div>

			{importState.isLoading ? (
				<p style={{ color: FC.dim, fontSize: 13, margin: 0 }}>
					Loading reports…
				</p>
			) : filteredRows.length === 0 ? (
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 16,
						padding: '18px 16px',
						color: FC.mid,
						fontSize: 13,
						lineHeight: 1.5,
					}}
				>
					{filter === 'all'
						? 'No imported reports yet. Scan your assigned folder to discover lab reports.'
						: 'No reports match this filter.'}
				</div>
			) : (
				filteredRows.map((row) => (
					<SetupReportRow
						key={row.key}
						row={row}
						isBusy={busyRowKey === row.key || isBulkBusy}
						onReimport={(item) => void handleRowReimport(item)}
						onReprocess={(item) => void handleRowReprocess(item)}
						onReprocessWithAi={(item) => void handleRowReprocessWithAi(item)}
					/>
				))
			)}
		</div>
	)
}

function BulkButton({
	label,
	onClick,
	disabled,
	busy,
	icon: Icon,
}: {
	label: string
	onClick: () => void
	disabled: boolean
	busy: boolean
	icon?: typeof RefreshCw
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				background: FC.ghost,
				border: `1px solid ${FC.line}`,
				borderRadius: 10,
				padding: '7px 12px',
				fontSize: 12,
				fontWeight: 600,
				color: FC.mid,
				cursor: disabled ? 'default' : 'pointer',
				opacity: disabled ? 0.55 : 1,
				fontFamily: 'inherit',
			}}
		>
			{busy ? (
				<Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
			) : Icon ? (
				<Icon size={13} />
			) : null}
			{label}
		</button>
	)
}
