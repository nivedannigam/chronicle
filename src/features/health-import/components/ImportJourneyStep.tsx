import { Check, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import type { AssignmentSuccessInfo } from '@/features/family/types/family.types'
import {
	IMPORT_JOURNEY_STEPS,
	type ImportJourneyOutcome,
	type ImportJourneyPhase,
	type ImportJourneyResult,
} from '@/features/health-import/types/health-import-journey.types'

interface ImportJourneyStepProps {
	successInfo: AssignmentSuccessInfo
	phase: ImportJourneyPhase
	phasesCompleted: ImportJourneyPhase[]
	phasesSucceeded?: ImportJourneyPhase[]
	result: ImportJourneyResult | null
	isRunning: boolean
	errorMessage: string | null
	onRetry: () => void
	onChooseDifferentFolder: () => void
	onClose: () => void
	/** When true, action buttons render via ImportJourneyFooter instead of inline. */
	hideFooter?: boolean
}

function isOAuthError(message: string | null | undefined): boolean {
	if (!message) {
		return false
	}

	const normalized = message.toUpperCase()

	return (
		normalized.includes('401') ||
		normalized.includes('UNAUTHENTICATED') ||
		normalized.includes('GOOGLE_AUTH_EXPIRED') ||
		normalized.includes('RECONNECT')
	)
}

export function ImportJourneyStep({
	successInfo,
	phase,
	phasesCompleted,
	phasesSucceeded = [],
	result,
	isRunning,
	errorMessage,
	onRetry,
	onChooseDifferentFolder,
	onClose,
	hideFooter = false,
}: ImportJourneyStepProps) {
	const navigate = useNavigate()
	const outcome = result?.outcome ?? null
	const completedSet = new Set(phasesCompleted)
	const succeededSet = new Set(phasesSucceeded)
	const memberLabel =
		successInfo.memberLabels[0] ?? successInfo.memberLabels.join(' · ')
	const failureMessage =
		result?.primaryError ?? result?.errorMessage ?? errorMessage
	const showBanner =
		Boolean(errorMessage) &&
		errorMessage !== failureMessage &&
		errorMessage !== result?.errorMessage
	const oauthError = isOAuthError(failureMessage ?? errorMessage)

	return (
		<div>
			<div
				style={{
					fontSize: 18,
					fontWeight: 800,
					color: C.text,
					marginBottom: 6,
					textAlign: 'center',
				}}
			>
				{phase === 'summary'
					? outcome === 'candidates_found'
						? 'Scan Complete'
						: 'Import Summary'
					: 'Importing Health Reports'}
			</div>
			<div
				style={{
					fontSize: 13,
					color: C.textSec,
					textAlign: 'center',
					marginBottom: 16,
					lineHeight: 1.5,
				}}
			>
				<div>📁 {successInfo.folderName}</div>
				{memberLabel ? <div style={{ marginTop: 4 }}>{memberLabel}</div> : null}
			</div>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 8,
					marginBottom: 18,
				}}
			>
				{IMPORT_JOURNEY_STEPS.map((step) => {
					const isComplete = succeededSet.has(step.phase)
					const isFailed =
						phase === 'summary' &&
						completedSet.has(step.phase) &&
						!succeededSet.has(step.phase) &&
						outcome !== 'candidates_found'
					const isActive =
						step.phase === phase && phase !== 'summary' && isRunning
					const summaryLabel =
						step.phase === 'summary' && outcome === 'candidates_found'
							? 'Needs review'
							: step.label

					return (
						<JourneyStepRow
							key={step.phase}
							label={summaryLabel}
							isComplete={isComplete}
							isActive={isActive}
							isFailed={isFailed}
						/>
					)
				})}
			</div>

			{phase === 'summary' && result ? (
				<SummaryPanel
					result={result}
					onReview={() => {
						onClose()
						navigate(ROUTES.healthImportReview)
					}}
				/>
			) : null}

			{showBanner && errorMessage ? (
				<ErrorBanner message={errorMessage} />
			) : null}

			{phase === 'summary' && !hideFooter ? (
				<ImportJourneyFooter
					outcome={outcome}
					isRunning={isRunning}
					oauthError={oauthError}
					needsReview={result?.needsReview ?? 0}
					onViewDashboard={() => {
						onClose()
						navigate(ROUTES.health)
					}}
					onReview={() => {
						onClose()
						navigate(ROUTES.healthImportReview)
					}}
					onReconnect={() => {
						onClose()
						navigate(ROUTES.profileConnectionsDrive)
					}}
					onRetry={onRetry}
					onChooseDifferentFolder={onChooseDifferentFolder}
				/>
			) : isRunning ? (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 8,
						fontSize: 13,
						color: C.textSec,
						padding: '8px 0',
					}}
				>
					<Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
					Working…
				</div>
			) : null}
		</div>
	)
}

function JourneyStepRow({
	label,
	isComplete,
	isActive,
	isFailed,
}: {
	label: string
	isComplete: boolean
	isActive: boolean
	isFailed: boolean
}) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				padding: '8px 10px',
				borderRadius: 12,
				background: isActive ? C.accentDim : 'transparent',
				border: isActive
					? '1px solid rgba(108,111,255,0.25)'
					: '1px solid transparent',
				opacity: isFailed ? 0.85 : 1,
			}}
		>
			<div
				style={{
					width: 22,
					height: 22,
					borderRadius: '50%',
					background: isComplete
						? C.greenAlt
						: isFailed
							? 'rgba(255,69,58,0.18)'
							: isActive
								? C.accent
								: 'rgba(255,255,255,0.06)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				{isComplete ? (
					<Check size={12} color={C.white} strokeWidth={3} />
				) : isActive ? (
					<Loader2
						size={12}
						color={C.white}
						style={{ animation: 'spin 1s linear infinite' }}
					/>
				) : null}
			</div>
			<div
				style={{
					fontSize: 13,
					fontWeight: isActive ? 700 : 500,
					color:
						isComplete || isActive ? C.text : isFailed ? C.red : C.textMuted,
				}}
			>
				{label}
				{isFailed ? ' (failed)' : ''}
			</div>
		</div>
	)
}

function SummaryPanel({
	result,
	onReview,
}: {
	result: ImportJourneyResult
	onReview: () => void
}) {
	const failureMessage = result.primaryError ?? result.errorMessage
	const extraErrorCount = (result.errorSamples?.length ?? 0) - 1

	return (
		<div
			style={{
				background: C.card2,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				padding: '14px 16px',
				marginBottom: 14,
			}}
		>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
				<Stat
					label="Files found"
					value={String(result.filesFound)}
					hint="Discovered in your Drive folder"
				/>
				<Stat
					label="Candidates this scan"
					value={String(result.importCandidates)}
					hint="Possible health reports found in this scan"
				/>
				<Stat
					label="Imported this run"
					value={String(result.importedThisRun)}
					hint="Auto-approved and processed"
				/>
				<Stat label="Failed this run" value={String(result.failedThisRun)} />
				<Stat label="Skipped this run" value={String(result.skippedThisRun)} />
				<Stat label="Total imported" value={String(result.reportsImported)} />
				<Stat
					label="Needs review"
					value={String(result.needsReview)}
					hint="Review in Setup to import remaining files"
				/>
				<Stat label="Auto-approved" value={String(result.autoApprovedCount)} />
				<Stat
					label="Results organized"
					value={String(result.metricsExtracted)}
					hint="From imported reports this run"
				/>
				{result.failedCount > 0 ? (
					<Stat label="Total failed" value={String(result.failedCount)} />
				) : null}
			</div>
			{result.needsReview > 0 ? (
				<button
					type="button"
					onClick={onReview}
					style={{
						marginTop: 12,
						width: '100%',
						background: 'rgba(108,111,255,0.12)',
						border: '1px solid rgba(108,111,255,0.25)',
						borderRadius: 12,
						padding: '10px 12px',
						fontSize: 12,
						fontWeight: 600,
						color: C.accent,
						cursor: 'pointer',
						fontFamily: 'inherit',
						textAlign: 'left',
					}}
				>
					Review remaining {result.needsReview} file
					{result.needsReview === 1 ? '' : 's'} →
				</button>
			) : null}
			{failureMessage ? (
				<div style={{ marginTop: 12 }}>
					<div
						style={{
							fontSize: 11,
							fontWeight: 700,
							color: C.textMuted,
							marginBottom: 4,
						}}
					>
						Why it failed
					</div>
					<div style={{ fontSize: 12, color: C.red, lineHeight: 1.5 }}>
						{failureMessage}
					</div>
					{extraErrorCount > 0 ? (
						<div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
							+ {extraErrorCount} more error type
							{extraErrorCount === 1 ? '' : 's'}
						</div>
					) : null}
				</div>
			) : null}
		</div>
	)
}

function Stat({
	label,
	value,
	hint,
}: {
	label: string
	value: string
	hint?: string
}) {
	return (
		<div>
			<div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>
				{label}
			</div>
			<div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
				{value}
			</div>
			{hint ? (
				<div
					style={{
						fontSize: 10,
						color: C.textMuted,
						marginTop: 2,
						lineHeight: 1.35,
					}}
				>
					{hint}
				</div>
			) : null}
		</div>
	)
}

function ErrorBanner({ message }: { message: string }) {
	return (
		<div
			style={{
				background: 'rgba(255,69,58,0.08)',
				border: '1px solid rgba(255,69,58,0.2)',
				borderRadius: 12,
				padding: '10px 12px',
				marginBottom: 14,
				fontSize: 12,
				color: C.red,
				lineHeight: 1.5,
			}}
		>
			{message}
		</div>
	)
}

export function ImportJourneyFooter({
	outcome,
	isRunning,
	oauthError,
	needsReview,
	onViewDashboard,
	onReview,
	onReconnect,
	onRetry,
	onChooseDifferentFolder,
}: {
	outcome: ImportJourneyOutcome | null
	isRunning: boolean
	oauthError: boolean
	needsReview: number
	onViewDashboard: () => void
	onReview: () => void
	onReconnect: () => void
	onRetry: () => void
	onChooseDifferentFolder: () => void
}) {
	if (isRunning) {
		return null
	}

	if (outcome === 'success' || outcome === 'partial_success') {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
				{needsReview > 0 ? (
					<ActionButton
						label={`Review remaining ${needsReview}`}
						variant="primary"
						onClick={onReview}
					/>
				) : null}
				<ActionButton
					label="Open Health"
					variant={needsReview > 0 ? 'secondary' : 'primary'}
					onClick={onViewDashboard}
				/>
				{outcome === 'partial_success' ? (
					<ActionButton
						label="Retry Failed Imports"
						variant="secondary"
						onClick={onRetry}
					/>
				) : null}
			</div>
		)
	}

	if (outcome === 'candidates_found') {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
				<ActionButton
					label="Review & Import Reports"
					variant="primary"
					onClick={onReview}
				/>
				<ActionButton
					label="Retry Scan"
					variant="secondary"
					onClick={onRetry}
				/>
				{oauthError ? (
					<ActionButton
						label="Reconnect Google Drive"
						variant="secondary"
						onClick={onReconnect}
					/>
				) : null}
			</div>
		)
	}

	if (outcome === 'failed') {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
				<ActionButton label="Retry Scan" variant="primary" onClick={onRetry} />
				{oauthError ? (
					<ActionButton
						label="Reconnect Google Drive"
						variant="secondary"
						onClick={onReconnect}
					/>
				) : null}
				<ActionButton
					label="Choose Different Folder"
					variant="secondary"
					onClick={onChooseDifferentFolder}
				/>
			</div>
		)
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
			<ActionButton
				label="Choose Different Folder"
				variant="primary"
				onClick={onChooseDifferentFolder}
			/>
			<ActionButton
				label="Close"
				variant="secondary"
				onClick={onChooseDifferentFolder}
			/>
		</div>
	)
}

function ActionButton({
	label,
	variant,
	onClick,
}: {
	label: string
	variant: 'primary' | 'secondary'
	onClick: () => void
}) {
	const isPrimary = variant === 'primary'

	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				width: '100%',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: isPrimary ? C.accent : C.card2,
				border: isPrimary ? 'none' : `1px solid ${C.border}`,
				borderRadius: 100,
				padding: '12px 16px',
				fontSize: 13,
				fontWeight: 700,
				color: isPrimary ? C.white : C.textSec,
				cursor: 'pointer',
				fontFamily: 'inherit',
			}}
		>
			{label}
		</button>
	)
}
