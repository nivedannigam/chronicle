import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	Check,
	ChevronRight,
	Cloud,
	FolderOpen,
	Loader2,
	ScanSearch,
	ShieldCheck,
} from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { runHealthImportJourney } from '@/features/health-import/services/health-import-journey.service'
import { useHealthMemberSetup } from '@/features/health/hooks/useHealthMemberSetup'

const STEPS = [
	{
		id: 'connect_drive',
		title: 'Connect Google Drive',
		description:
			'Link the Google account where your medical reports are stored.',
		icon: Cloud,
	},
	{
		id: 'assign_folder',
		title: 'Choose health folder',
		description: 'Assign a Drive folder to the selected family member.',
		icon: FolderOpen,
	},
	{
		id: 'scan_import',
		title: 'Scan & import reports',
		description:
			'Chronicle finds medical PDFs, extracts data, and prepares them for review.',
		icon: ScanSearch,
	},
	{
		id: 'review_imports',
		title: 'Review & approve',
		description:
			'Confirm detected reports before they appear on your dashboard.',
		icon: ShieldCheck,
	},
] as const

interface HealthSetupGuideProps {
	compact?: boolean
}

export function HealthSetupGuide({ compact = false }: HealthSetupGuideProps) {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { selectedMember } = useFamilyContext()
	const setup = useHealthMemberSetup()
	const [isScanning, setIsScanning] = useState(false)
	const [scanDetail, setScanDetail] = useState<string | null>(null)
	const [scanError, setScanError] = useState<string | null>(null)

	const handlePrimaryAction = async () => {
		if (!user?.id) {
			return
		}

		switch (setup.currentStep) {
			case 'connect_drive':
				navigate(ROUTES.healthSettings)
				return
			case 'assign_folder':
				navigate(ROUTES.healthSettings)
				return
			case 'review_imports':
				navigate(ROUTES.healthImportReview)
				return
			case 'scan_import': {
				const folderIds = setup.memberAssignments.map(
					(assignment) => assignment.externalFolderId,
				)

				if (folderIds.length === 0) {
					navigate(ROUTES.healthSettings)
					return
				}

				setIsScanning(true)
				setScanError(null)
				setScanDetail('Starting scan…')

				try {
					await runHealthImportJourney(user.id, folderIds, (progress) => {
						setScanDetail(progress.detail)
					})
					await setup.refetch()
				} catch (error) {
					setScanError(
						error instanceof Error
							? error.message
							: 'Import failed. Please try again.',
					)
				} finally {
					setIsScanning(false)
					setScanDetail(null)
				}

				return
			}
			default:
				return
		}
	}

	const primaryLabel = (() => {
		switch (setup.currentStep) {
			case 'connect_drive':
				return 'Connect Google Drive'
			case 'assign_folder':
				return 'Assign health folder'
			case 'scan_import':
				return isScanning ? 'Importing…' : 'Scan & import now'
			case 'review_imports':
				return `Review ${setup.needsReview} report${setup.needsReview === 1 ? '' : 's'}`
			default:
				return 'Get started'
		}
	})()

	const stepIndex = STEPS.findIndex((step) => step.id === setup.currentStep)

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 20,
				padding: compact ? '16px' : '20px 18px',
				marginBottom: compact ? 16 : 24,
			}}
		>
			<div style={{ marginBottom: 16 }}>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.09em',
						textTransform: 'uppercase',
						color: C.textMuted,
						marginBottom: 6,
					}}
				>
					Get started
				</div>
				<div
					style={{
						fontSize: compact ? 18 : 22,
						fontWeight: 800,
						letterSpacing: '-0.03em',
						marginBottom: 6,
					}}
				>
					Complete Health for {selectedMember?.displayName ?? 'this member'}
				</div>
				<div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
					Connect Google Drive, choose a folder, and Chronicle handles the rest.
				</div>
			</div>

			<div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
				{STEPS.map((step, index) => {
					const Icon = step.icon
					const completed = index < stepIndex || setup.currentStep === 'ready'
					const active = step.id === setup.currentStep

					return (
						<div
							key={step.id}
							style={{
								display: 'flex',
								alignItems: 'flex-start',
								gap: 12,
								padding: '12px 14px',
								borderRadius: 14,
								background: active ? `${C.accent}12` : C.card2,
								border: active
									? `1px solid ${C.accent}44`
									: `1px solid ${C.border}`,
							}}
						>
							<div
								style={{
									width: 32,
									height: 32,
									borderRadius: 10,
									background: completed ? `${C.greenAlt}22` : C.card,
									border: `1px solid ${completed ? C.greenAlt : C.border}`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flexShrink: 0,
								}}
							>
								{completed ? (
									<Check size={16} color={C.greenAlt} />
								) : (
									<Icon size={16} color={active ? C.accent : C.textMuted} />
								)}
							</div>
							<div style={{ flex: 1 }}>
								<div
									style={{
										fontSize: 14,
										fontWeight: 700,
										color: C.text,
										marginBottom: 2,
									}}
								>
									{step.title}
								</div>
								<div
									style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.45 }}
								>
									{step.description}
								</div>
							</div>
						</div>
					)
				})}
			</div>

			{scanDetail ? (
				<div
					style={{
						fontSize: 12,
						color: C.textSec,
						marginBottom: 12,
						display: 'flex',
						alignItems: 'center',
						gap: 8,
					}}
				>
					<Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
					{scanDetail}
				</div>
			) : null}

			{scanError ? (
				<div
					style={{
						fontSize: 13,
						color: C.red,
						marginBottom: 12,
						lineHeight: 1.45,
					}}
				>
					{scanError}
				</div>
			) : null}

			{setup.currentStep !== 'ready' ? (
				<button
					type="button"
					onClick={() => void handlePrimaryAction()}
					disabled={isScanning || setup.isLoading}
					style={{
						width: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 8,
						background: C.accent,
						color: C.white,
						border: 'none',
						borderRadius: 100,
						padding: '12px 18px',
						fontSize: 14,
						fontWeight: 700,
						cursor: isScanning || setup.isLoading ? 'not-allowed' : 'pointer',
						fontFamily: 'inherit',
						opacity: isScanning || setup.isLoading ? 0.7 : 1,
					}}
				>
					{isScanning ? (
						<Loader2
							size={16}
							style={{ animation: 'spin 1s linear infinite' }}
						/>
					) : null}
					{primaryLabel}
					{!isScanning ? <ChevronRight size={16} /> : null}
				</button>
			) : null}
		</div>
	)
}
