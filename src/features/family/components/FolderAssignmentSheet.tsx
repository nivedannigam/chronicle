import { Check, FolderOpen, Loader2, Sparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '@/components/layout/mobile'
import { C } from '@/constants/colors'
import { ROUTES, healthSettingsSection } from '@/constants/routes'
import {
	MODULE_FOLDER_LABELS,
	type FolderAssignmentModuleId,
} from '@/features/connectors/services/folder-assignment-module.resolver'
import {
	formatMemberLabel,
	getNonRedundantAliases,
} from '@/features/family/services/folder-match.service'
import type {
	AssignmentSuccessInfo,
	ExistingFolderMode,
	FamilyMemberWithAliases,
	FolderAssignmentStep,
	FolderMatchSuggestion,
	HealthSourceAssignment,
} from '@/features/family/types/family.types'
import { dedupeFamilyMembers } from '@/features/family/utils/dedupe-family-members'
import {
	ImportJourneyFooter,
	ImportJourneyStep,
} from '@/features/health-import/components/ImportJourneyStep'
import type {
	ImportJourneyPhase,
	ImportJourneyResult,
} from '@/features/health-import/types/health-import-journey.types'

interface FolderAssignmentSheetProps {
	members: FamilyMemberWithAliases[]
	isOpen: boolean
	folderName: string
	moduleId?: FolderAssignmentModuleId
	step: FolderAssignmentStep
	suggestion: FolderMatchSuggestion | null
	selectedMemberIds: string[]
	existingFolders: HealthSourceAssignment[]
	existingMode: ExistingFolderMode
	isSaving?: boolean
	errorMessage?: string | null
	successInfo?: AssignmentSuccessInfo | null
	journeyPhase?: ImportJourneyPhase
	journeyPhasesCompleted?: ImportJourneyPhase[]
	journeyPhasesSucceeded?: ImportJourneyPhase[]
	journeyResult?: ImportJourneyResult | null
	isJourneyRunning?: boolean
	onClose: () => void
	onConfirmSuggestion: () => void
	onChooseDifferentPerson: () => void
	onToggleMember: (memberId: string) => void
	onExistingModeChange: (mode: ExistingFolderMode) => void
	onContinueExisting: () => void
	onAssign: () => void
	onRetryJourney: () => void
	onChooseDifferentFolder: () => void
}

export function FolderAssignmentSheet(props: FolderAssignmentSheetProps) {
	const {
		members,
		isOpen,
		folderName,
		moduleId = 'health',
		step,
		suggestion,
		selectedMemberIds,
		existingFolders,
		existingMode,
		isSaving = false,
		errorMessage = null,
		successInfo = null,
		journeyPhase = 'assign',
		journeyPhasesCompleted = ['assign'],
		journeyPhasesSucceeded = ['assign'],
		journeyResult = null,
		isJourneyRunning = false,
		onClose,
		onConfirmSuggestion,
		onChooseDifferentPerson,
		onToggleMember,
		onExistingModeChange,
		onContinueExisting,
		onAssign,
		onRetryJourney,
		onChooseDifferentFolder,
	} = props

	const navigate = useNavigate()
	const uniqueMembers = dedupeFamilyMembers(members)
	const preventClose = isSaving || isJourneyRunning
	const journeyOutcome = journeyResult?.outcome ?? null
	const moduleLabel = MODULE_FOLDER_LABELS[moduleId]
	const oauthError = Boolean(
		errorMessage &&
		/(401|UNAUTHENTICATED|GOOGLE_AUTH_EXPIRED|RECONNECT)/i.test(errorMessage),
	)

	const footer =
		step === 'pick' ? (
			<div
				style={{
					display: 'flex',
					gap: 10,
					width: '100%',
					minWidth: 0,
				}}
			>
				<ActionButton
					label="Cancel"
					variant="secondary"
					disabled={isSaving}
					onClick={onClose}
				/>
				<ActionButton
					label={isSaving ? 'Saving…' : 'Assign Folder'}
					variant="primary"
					disabled={isSaving || selectedMemberIds.length === 0}
					loading={isSaving}
					onClick={onAssign}
				/>
			</div>
		) : step === 'existing' ? (
			<div
				style={{
					display: 'flex',
					gap: 10,
					width: '100%',
					minWidth: 0,
				}}
			>
				<ActionButton
					label="Cancel"
					variant="secondary"
					disabled={isSaving}
					onClick={onClose}
				/>
				<ActionButton
					label={isSaving ? 'Saving…' : 'Continue'}
					variant="primary"
					disabled={isSaving}
					loading={isSaving}
					onClick={onContinueExisting}
				/>
			</div>
		) : step === 'suggest' ? (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
				<ActionButton
					label={isSaving ? 'Saving…' : 'Confirm'}
					variant="primary"
					disabled={isSaving}
					loading={isSaving}
					onClick={onConfirmSuggestion}
				/>
				<ActionButton
					label="Choose Different Person"
					variant="secondary"
					disabled={isSaving}
					onClick={onChooseDifferentPerson}
				/>
			</div>
		) : step === 'journey' && journeyPhase === 'summary' ? (
			<ImportJourneyFooter
				outcome={journeyOutcome}
				isRunning={isJourneyRunning}
				oauthError={oauthError}
				needsReview={journeyResult?.needsReview ?? 0}
				moduleId={moduleId}
				onViewDashboard={() => {
					onClose()
					if (moduleId === 'insurance') {
						navigate(ROUTES.insurance)
						return
					}

					if (moduleId === 'vehicles') {
						navigate(ROUTES.vehicles)
						return
					}

					navigate(ROUTES.health)
				}}
				onReview={() => {
					onClose()
					if (moduleId === 'insurance') {
						navigate(ROUTES.insuranceSettings)
						return
					}

					if (moduleId === 'vehicles') {
						navigate(ROUTES.vehiclesSettings)
						return
					}

					navigate(healthSettingsSection('review'))
				}}
				onReconnect={() => {
					onClose()
					navigate(ROUTES.profileConnectionsDrive)
				}}
				onRetry={onRetryJourney}
				onChooseDifferentFolder={onChooseDifferentFolder}
			/>
		) : null

	return (
		<BottomSheet
			isOpen={isOpen}
			onClose={preventClose ? undefined : onClose}
			preventClose={preventClose}
			aria-label={`Assign ${moduleLabel} Folder`}
			footer={footer}
			header={
				step === 'journey' ? null : (
					<SheetHeader
						title={
							step === 'existing'
								? 'Existing Folder Assignment'
								: `Assign ${moduleLabel} Folder`
						}
						subtitle={
							step === 'existing'
								? 'This family member already has folders assigned.'
								: 'Which family member should use this folder?'
						}
						folderName={folderName}
						isSaving={isSaving}
						onClose={onClose}
					/>
				)
			}
		>
			{step === 'journey' && successInfo ? (
				<ImportJourneyStep
					successInfo={successInfo}
					phase={journeyPhase}
					phasesCompleted={journeyPhasesCompleted}
					phasesSucceeded={journeyPhasesSucceeded}
					result={journeyResult}
					isRunning={isJourneyRunning}
					errorMessage={errorMessage}
					moduleId={moduleId}
					onRetry={onRetryJourney}
					onChooseDifferentFolder={onChooseDifferentFolder}
					onClose={onClose}
					hideFooter
				/>
			) : (
				<>
					{errorMessage ? <ErrorBanner message={errorMessage} /> : null}

					{step === 'suggest' && suggestion ? (
						<SuggestStep suggestion={suggestion} />
					) : null}

					{step === 'pick' ? (
						<PickStep
							members={uniqueMembers}
							selectedMemberIds={selectedMemberIds}
							isSaving={isSaving}
							onToggleMember={onToggleMember}
						/>
					) : null}

					{step === 'existing' ? (
						<ExistingStep
							existingFolders={existingFolders}
							existingMode={existingMode}
							isSaving={isSaving}
							onExistingModeChange={onExistingModeChange}
						/>
					) : null}
				</>
			)}
		</BottomSheet>
	)
}

function SheetHeader({
	title,
	subtitle,
	folderName,
	isSaving,
	onClose,
}: {
	title: string
	subtitle: string
	folderName: string
	isSaving: boolean
	onClose: () => void
}) {
	return (
		<>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					marginBottom: 8,
					gap: 12,
				}}
			>
				<div>
					<div
						style={{
							fontSize: 18,
							fontWeight: 800,
							color: C.text,
							marginBottom: 4,
						}}
					>
						{title}
					</div>
					<div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
						{subtitle}
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					disabled={isSaving}
					style={{
						background: 'none',
						border: 'none',
						color: C.textMuted,
						cursor: isSaving ? 'not-allowed' : 'pointer',
						padding: 4,
					}}
				>
					<X size={18} />
				</button>
			</div>
			<div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
				Folder: <span style={{ color: C.textSec }}>{folderName}</span>
			</div>
		</>
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

function SuggestStep({ suggestion }: { suggestion: FolderMatchSuggestion }) {
	return (
		<div
			style={{
				background: 'rgba(52,211,153,0.08)',
				border: '1px solid rgba(52,211,153,0.22)',
				borderRadius: 16,
				padding: '16px 16px 14px',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					marginBottom: 12,
				}}
			>
				<Sparkles size={16} color={C.greenAlt} />
				<div style={{ fontSize: 12, fontWeight: 700, color: C.greenAlt }}>
					Suggested Match
				</div>
			</div>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					fontSize: 16,
					fontWeight: 800,
					color: C.text,
					marginBottom: 12,
				}}
			>
				<Check size={18} color={C.greenAlt} strokeWidth={2.5} />
				{suggestion.memberLabel}
			</div>

			<div style={{ marginBottom: 12 }}>
				<div
					style={{
						fontSize: 11,
						fontWeight: 700,
						color: C.textMuted,
						textTransform: 'uppercase',
						letterSpacing: '0.08em',
						marginBottom: 6,
					}}
				>
					Confidence
				</div>
				<div style={{ fontSize: 22, fontWeight: 800, color: C.greenAlt }}>
					{suggestion.confidence}%
				</div>
			</div>

			<div>
				<div
					style={{
						fontSize: 11,
						fontWeight: 700,
						color: C.textMuted,
						textTransform: 'uppercase',
						letterSpacing: '0.08em',
						marginBottom: 6,
					}}
				>
					Reason
				</div>
				{suggestion.reasons.map((reason) => (
					<div
						key={reason}
						style={{ fontSize: 12, color: C.textSec, marginBottom: 2 }}
					>
						• {reason}
					</div>
				))}
			</div>
		</div>
	)
}

function PickStep({
	members,
	selectedMemberIds,
	isSaving,
	onToggleMember,
}: {
	members: FamilyMemberWithAliases[]
	selectedMemberIds: string[]
	isSaving: boolean
	onToggleMember: (memberId: string) => void
}) {
	return (
		<div>
			<div
				style={{
					fontSize: 12,
					fontWeight: 700,
					color: C.textMuted,
					textTransform: 'uppercase',
					letterSpacing: '0.08em',
					marginBottom: 10,
				}}
			>
				Select Family Member
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{members.map((member) => {
					const memberLabel = formatMemberLabel(member)
					const visibleAliases = getNonRedundantAliases(member, memberLabel)
					const isSelected = selectedMemberIds.includes(member.id)

					return (
						<button
							key={member.id}
							type="button"
							disabled={isSaving}
							onClick={() => onToggleMember(member.id)}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 12,
								padding: '12px 14px',
								borderRadius: 14,
								background: isSelected ? C.accentDim : C.card2,
								border: `1px solid ${isSelected ? 'rgba(108,111,255,0.35)' : C.border}`,
								cursor: isSaving ? 'not-allowed' : 'pointer',
								fontFamily: 'inherit',
								textAlign: 'left',
								opacity: isSaving ? 0.6 : 1,
							}}
						>
							<CheckboxIndicator selected={isSelected} />
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
									{memberLabel}
								</div>
								{visibleAliases.length > 0 ? (
									<div
										style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}
									>
										Also known as {visibleAliases.join(', ')}
									</div>
								) : null}
							</div>
						</button>
					)
				})}
			</div>
		</div>
	)
}

function ExistingStep({
	existingFolders,
	existingMode,
	isSaving,
	onExistingModeChange,
}: {
	existingFolders: HealthSourceAssignment[]
	existingMode: ExistingFolderMode
	isSaving: boolean
	onExistingModeChange: (mode: ExistingFolderMode) => void
}) {
	return (
		<div>
			<div
				style={{
					fontSize: 13,
					color: C.textSec,
					marginBottom: 12,
					lineHeight: 1.5,
				}}
			>
				This family member already has:
			</div>

			{existingFolders.map((folder) => (
				<div
					key={folder.id}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						padding: '10px 12px',
						borderRadius: 12,
						background: C.card2,
						border: `1px solid ${C.border}`,
						marginBottom: 8,
					}}
				>
					<FolderOpen size={16} color={C.accentBlue} />
					<div style={{ fontSize: 13, color: C.text }}>{folder.folderName}</div>
				</div>
			))}

			<div style={{ fontSize: 13, color: C.textSec, margin: '14px 0 12px' }}>
				What would you like to do?
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<ModeOption
					label="Replace Existing Folder"
					description="Remove previous folders and use this one instead"
					selected={existingMode === 'replace'}
					disabled={isSaving}
					onClick={() => onExistingModeChange('replace')}
				/>
				<ModeOption
					label="Add Another Folder"
					description="Keep existing folders and add this one too"
					selected={existingMode === 'add'}
					disabled={isSaving}
					onClick={() => onExistingModeChange('add')}
				/>
			</div>
		</div>
	)
}

function CheckboxIndicator({ selected }: { selected: boolean }) {
	return (
		<div
			style={{
				width: 20,
				height: 20,
				borderRadius: 6,
				border: `2px solid ${selected ? C.accent : C.border}`,
				background: selected ? C.accent : 'transparent',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
			}}
		>
			{selected ? <Check size={12} color={C.white} strokeWidth={3} /> : null}
		</div>
	)
}

function RadioIndicator({ selected }: { selected: boolean }) {
	return (
		<div
			style={{
				width: 20,
				height: 20,
				borderRadius: '50%',
				border: `2px solid ${selected ? C.accent : C.border}`,
				background: selected ? C.accent : 'transparent',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
			}}
		>
			{selected ? (
				<div
					style={{
						width: 8,
						height: 8,
						borderRadius: '50%',
						background: C.white,
					}}
				/>
			) : null}
		</div>
	)
}

function ModeOption({
	label,
	description,
	selected,
	disabled,
	onClick,
}: {
	label: string
	description: string
	selected: boolean
	disabled: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			style={{
				display: 'flex',
				alignItems: 'flex-start',
				gap: 12,
				padding: '12px 14px',
				borderRadius: 14,
				background: selected ? C.accentDim : C.card2,
				border: `1px solid ${selected ? 'rgba(108,111,255,0.35)' : C.border}`,
				cursor: disabled ? 'not-allowed' : 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
				opacity: disabled ? 0.6 : 1,
			}}
		>
			<RadioIndicator selected={selected} />
			<div>
				<div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
					{label}
				</div>
				<div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
					{description}
				</div>
			</div>
		</button>
	)
}

function ActionButton({
	label,
	variant,
	disabled,
	loading,
	onClick,
}: {
	label: string
	variant: 'primary' | 'secondary'
	disabled?: boolean
	loading?: boolean
	onClick: () => void
}) {
	const isPrimary = variant === 'primary'

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				flex: 1,
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 8,
				background: isPrimary ? C.accent : C.card2,
				border: isPrimary ? 'none' : `1px solid ${C.border}`,
				borderRadius: 100,
				padding: '12px 16px',
				fontSize: 13,
				fontWeight: 700,
				color: isPrimary ? C.white : C.textSec,
				cursor: disabled ? 'not-allowed' : 'pointer',
				fontFamily: 'inherit',
				opacity: disabled ? 0.6 : 1,
				width: '100%',
				minHeight: 44,
			}}
		>
			{loading ? (
				<Loader2
					size={16}
					className="animate-spin"
					style={{ animation: 'spin 1s linear infinite' }}
				/>
			) : null}
			{label}
		</button>
	)
}
