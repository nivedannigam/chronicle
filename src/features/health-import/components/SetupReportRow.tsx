import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { healthReportPath } from '@/constants/routes'
import type { SetupReportRowModel } from '@/features/health-import/types/setup-report-list.types'
import {
	setupReportStatusColor,
	setupReportStatusLabel,
} from '@/features/health-import/utils/setup-report-list.utils'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

interface SetupReportRowProps {
	row: SetupReportRowModel
	isBusy: boolean
	onReimport: (row: SetupReportRowModel) => void
	onReprocess: (row: SetupReportRowModel) => void
	onReprocessWithAi: (row: SetupReportRowModel) => void
}

export function SetupReportRow({
	row,
	isBusy,
	onReimport,
	onReprocess,
	onReprocessWithAi,
}: SetupReportRowProps) {
	const navigate = useNavigate()
	const [showErrorLog, setShowErrorLog] = useState(false)
	const badgeColor = setupReportStatusColor(row.status)
	const showActions = row.status !== 'processing' && row.status !== 'skipped'

	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 16,
				padding: '14px 16px',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					gap: 12,
				}}
			>
				<div style={{ flex: 1, minWidth: 0 }}>
					<p
						style={{
							color: FC.fg,
							fontSize: 14,
							fontWeight: 600,
							margin: '0 0 4px',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{row.title}
					</p>
					{row.subtitle ? (
						<p
							style={{
								color: FC.dim,
								fontSize: 12,
								margin: '0 0 6px',
							}}
						>
							{row.subtitle}
						</p>
					) : null}
					{row.reason ? (
						<p
							style={{
								color: FC.mid,
								fontSize: 12.5,
								lineHeight: 1.45,
								margin: 0,
							}}
						>
							{row.reason}
						</p>
					) : null}
					{row.status === 'processing' ? (
						<>
							{row.stageLabel ? (
								<p
									style={{
										color: FC.blue,
										fontSize: 12,
										fontWeight: 500,
										margin: '6px 0 0',
									}}
								>
									{row.stageLabel}
								</p>
							) : null}
							<p
								style={{
									color: FC.dim,
									fontSize: 12,
									margin: row.stageLabel ? '4px 0 0' : '6px 0 0',
								}}
							>
								This may take a few minutes.
							</p>
						</>
					) : null}
				</div>
				<span
					style={{
						fontSize: 10,
						fontWeight: 700,
						color: badgeColor,
						background: `${badgeColor}18`,
						borderRadius: 100,
						padding: '4px 9px',
						flexShrink: 0,
						letterSpacing: '0.02em',
					}}
				>
					{setupReportStatusLabel(row.status)}
				</span>
			</div>

			{showActions ? (
				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: 8,
						marginTop: 12,
					}}
				>
					{row.canViewReport && row.reportId ? (
						<RowAction
							label="View report"
							primary
							disabled={isBusy}
							onClick={() => navigate(healthReportPath(row.reportId!))}
						/>
					) : null}
					{row.canReimport ? (
						<RowAction
							label={isBusy ? 'Retrying…' : 'Reimport'}
							disabled={isBusy}
							onClick={() => onReimport(row)}
						/>
					) : null}
					{row.canReprocess &&
					(row.status === 'failed' || row.status === 'needs_reprocess') ? (
						<RowAction
							label={isBusy ? 'Reprocessing…' : 'Reprocess'}
							disabled={isBusy}
							onClick={() => onReprocess(row)}
						/>
					) : null}
					{row.canReprocessWithAi &&
					(row.status === 'failed' || row.status === 'needs_reprocess') ? (
						<RowAction
							label={isBusy ? 'AI…' : 'Reprocess with AI'}
							icon={Sparkles}
							disabled={isBusy}
							onClick={() => onReprocessWithAi(row)}
						/>
					) : null}
					{row.errorLog ? (
						<RowAction
							label={showErrorLog ? 'Hide error log' : 'Error log'}
							icon={showErrorLog ? ChevronUp : ChevronDown}
							disabled={false}
							onClick={() => setShowErrorLog((open) => !open)}
						/>
					) : null}
				</div>
			) : null}

			{showErrorLog && row.errorLog ? (
				<pre
					style={{
						marginTop: 10,
						marginBottom: 0,
						padding: '10px 12px',
						borderRadius: 10,
						background: `${FC.red}10`,
						border: `1px solid ${FC.red}22`,
						color: FC.mid,
						fontSize: 11.5,
						lineHeight: 1.5,
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
						fontFamily: 'inherit',
					}}
				>
					{row.errorLog}
				</pre>
			) : null}
		</div>
	)
}

function RowAction({
	label,
	onClick,
	disabled,
	primary,
	icon: Icon,
}: {
	label: string
	onClick: () => void
	disabled: boolean
	primary?: boolean
	icon?: typeof Sparkles
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
				background: primary ? FC.blue : FC.ghost,
				border: primary ? 'none' : `1px solid ${FC.line}`,
				borderRadius: 10,
				padding: '6px 11px',
				fontSize: 12,
				fontWeight: 600,
				color: primary ? '#fff' : FC.mid,
				cursor: disabled ? 'default' : 'pointer',
				opacity: disabled ? 0.55 : 1,
				fontFamily: 'inherit',
			}}
		>
			{disabled && primary ? (
				<Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
			) : Icon ? (
				<Icon size={12} />
			) : null}
			{label}
		</button>
	)
}
