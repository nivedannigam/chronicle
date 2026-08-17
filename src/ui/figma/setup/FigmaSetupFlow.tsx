import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	ArrowLeft,
	Check,
	ChevronLeft,
	ChevronRight,
	Cloud,
	Folder,
	Sparkles,
} from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ConnectorSettingsPanel } from '@/features/connectors/google-drive/components/ConnectorSettingsPanel'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useDriveBrowser } from '@/features/connectors/google-drive/hooks/useDriveBrowser'
import { logConnectorRequest } from '@/features/connectors/services/connector-request-logger'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { assignDiscoveredModuleFolders } from '@/features/setup/services/chronicle-root-assignment.service'
import {
	discoverModuleFoldersFromRoot,
	formatDiscoveredModuleLabel,
	type ChronicleRootDiscoveryResult,
} from '@/features/setup/services/chronicle-root-discovery.service'
import { completeChronicleSetup } from '@/features/setup/services/chronicle-setup.service'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

type SetupStep = 'welcome' | 'connect' | 'root' | 'found' | 'ready'

const STEPS: SetupStep[] = ['welcome', 'connect', 'root', 'found', 'ready']

export function FigmaSetupFlow() {
	const navigate = useNavigate()
	const { user, session } = useAuth()
	const userId = user?.id
	const { accountOwnerMemberId, members } = useFamilyContext()
	const [step, setStep] = useState<SetupStep>('welcome')
	const [discovery, setDiscovery] =
		useState<ChronicleRootDiscoveryResult | null>(null)
	const [selectedRoot, setSelectedRoot] = useState<{
		id: string
		name: string
		path: string
	} | null>(null)
	const [isSaving, setIsSaving] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const lastFinalizedTokenRef = useRef<string | null>(null)

	const drive = useGoogleDriveConnector(userId)
	const browser = useDriveBrowser(userId)

	useEffect(() => {
		const providerToken = session?.provider_token

		if (!userId || !providerToken) {
			return
		}

		if (lastFinalizedTokenRef.current === providerToken) {
			return
		}

		lastFinalizedTokenRef.current = providerToken
		logConnectorRequest(
			'FigmaSetupFlow',
			'drive-connector',
			'OAuth return finalize',
		)

		void drive.finalizeOAuthReturn({
			provider_token: providerToken,
			provider_refresh_token: session.provider_refresh_token,
		})
	}, [userId, session?.provider_token, session?.provider_refresh_token, drive])

	const stepIndex = STEPS.indexOf(step)
	const driveConnected = drive.connectionStatus === 'connected'
	const ownerMemberId =
		accountOwnerMemberId ?? members.find((member) => member.isAccountOwner)?.id

	const childFolders = useMemo(
		() =>
			browser.folders.map((folder) => ({ id: folder.id, name: folder.name })),
		[browser.folders],
	)

	const handleSelectRoot = () => {
		const root = {
			id: browser.currentFolderId,
			name: browser.currentFolderName,
			path: browser.currentFolderName,
		}

		setSelectedRoot(root)
		setDiscovery(
			discoverModuleFoldersFromRoot({
				rootFolderId: root.id,
				rootFolderName: root.name,
				rootFolderPath: root.path,
				childFolders,
			}),
		)
		setStep('found')
	}

	const handleContinueFromFound = async () => {
		if (!userId || !selectedRoot) {
			setStep('ready')
			completeChronicleSetup()
			navigate(ROUTES.home)
			return
		}

		const activeDiscovered =
			discovery?.recognized.filter((entry) => entry.active) ?? []

		if (activeDiscovered.length === 0 || !ownerMemberId) {
			completeChronicleSetup()
			setStep('ready')
			return
		}

		setIsSaving(true)
		setErrorMessage(null)

		try {
			await assignDiscoveredModuleFolders({
				userId,
				familyMemberId: ownerMemberId,
				rootFolder: {
					externalFolderId: selectedRoot.id,
					folderName: selectedRoot.name,
					folderPath: selectedRoot.path,
				},
				discovered: activeDiscovered,
			})
			setStep('ready')
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: 'Something went wrong. You can try again or continue.',
			)
		} finally {
			setIsSaving(false)
		}
	}

	if (!userId) {
		return null
	}

	return (
		<div style={{ padding: '0 22px 24px' }}>
			<div style={{ padding: '4px 0 18px' }}>
				<button
					type="button"
					onClick={() => {
						if (step === 'welcome') {
							navigate(ROUTES.home)
							return
						}

						const previous = STEPS[Math.max(stepIndex - 1, 0)]!
						setStep(previous)
					}}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						background: 'none',
						border: 'none',
						padding: 0,
						cursor: 'pointer',
						color: FC.mid,
						fontFamily: 'inherit',
						fontSize: 13,
						fontWeight: 600,
					}}
				>
					<ArrowLeft size={16} />
					{step === 'welcome' ? 'Home' : 'Back'}
				</button>
			</div>

			<div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
				{STEPS.map((entry, index) => (
					<div
						key={entry}
						style={{
							flex: 1,
							height: 4,
							borderRadius: 100,
							background:
								index <= stepIndex ? FC.blue : 'rgba(255,255,255,0.08)',
						}}
					/>
				))}
			</div>

			{step === 'welcome' ? (
				<StepCard
					icon={<Sparkles size={26} color={FC.blue} />}
					title="Welcome to Chronicle"
					body="Chronicle organizes your family health records, insurance, vehicles, and important documents in one calm, private place."
					primaryLabel="Get started"
					onPrimary={() => setStep('connect')}
					secondaryLabel="Skip for now"
					onSecondary={() => navigate(ROUTES.home)}
				/>
			) : null}

			{step === 'connect' ? (
				<div>
					<StepHeading
						title="Connect Google Drive"
						body="Chronicle reads your folders with read-only access. Your files stay in Drive."
					/>
					<ConnectorSettingsPanel
						connector={drive}
						onChanged={() => void drive.refresh('SetupFlow.onChanged')}
					/>
					<ActionButton
						label={driveConnected ? 'Continue' : 'Connect Drive to continue'}
						disabled={!driveConnected}
						onClick={() => setStep('root')}
					/>
				</div>
			) : null}

			{step === 'root' ? (
				<div>
					<StepHeading
						title="Choose your Chronicle folder"
						body="Select the main Chronicle folder in Google Drive. Chronicle will look inside it for Health, Insurance, Vehicles, and more."
					/>
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 18,
							padding: '14px 16px',
							marginBottom: 14,
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
							{browser.parentFolderId ? (
								<button
									type="button"
									onClick={browser.goBack}
									style={{
										background: 'none',
										border: 'none',
										color: FC.blue,
										cursor: 'pointer',
										padding: 0,
										display: 'inline-flex',
										alignItems: 'center',
										gap: 4,
										fontFamily: 'inherit',
										fontSize: 12,
										fontWeight: 700,
									}}
								>
									<ChevronLeft size={14} />
									Back
								</button>
							) : null}
							<span style={{ color: FC.fg, fontSize: 14, fontWeight: 700 }}>
								{browser.currentFolderName}
							</span>
						</div>

						{browser.isLoading ? (
							<p style={{ color: FC.dim, fontSize: 13, margin: 0 }}>
								Loading folders…
							</p>
						) : browser.folders.length === 0 ? (
							<p style={{ color: FC.dim, fontSize: 13, margin: 0 }}>
								No subfolders here yet. You can still use this folder as your
								Chronicle root.
							</p>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
								{browser.folders.slice(0, 8).map((folder) => (
									<button
										key={folder.id}
										type="button"
										onClick={() => browser.openFolder(folder.id)}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 10,
											background: FC.surface,
											border: `1px solid ${FC.line}`,
											borderRadius: 14,
											padding: '10px 12px',
											cursor: 'pointer',
											fontFamily: 'inherit',
											textAlign: 'left',
										}}
									>
										<Folder size={16} color={FC.amber} />
										<span
											style={{ color: FC.fg, fontSize: 13, fontWeight: 600 }}
										>
											{folder.name}
										</span>
									</button>
								))}
							</div>
						)}
					</div>

					<ActionButton
						label="Use this folder"
						onClick={handleSelectRoot}
						icon={Folder}
					/>
				</div>
			) : null}

			{step === 'found' && discovery ? (
				<div>
					<StepHeading
						title="Here's what we found"
						body="Chronicle will organize these automatically."
					/>

					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						{discovery.recognized.map((entry) => (
							<div
								key={`${entry.moduleId}-${entry.folderId}`}
								style={{
									...figmaCardStyle,
									borderRadius: 16,
									padding: '14px 16px',
									display: 'flex',
									alignItems: 'center',
									gap: 12,
								}}
							>
								<Check
									size={18}
									color={entry.active ? FC.green : FC.mid}
									strokeWidth={2.2}
								/>
								<div style={{ flex: 1 }}>
									<p
										style={{
											color: FC.fg,
											fontSize: 14,
											fontWeight: 700,
											margin: '0 0 2px',
										}}
									>
										{formatDiscoveredModuleLabel(entry.moduleId)}
									</p>
									<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>
										{entry.folderName}
										{entry.active ? '' : ' · Coming soon'}
									</p>
								</div>
							</div>
						))}
					</div>

					{discovery.unrecognized.length > 0 ? (
						<div
							style={{
								marginTop: 16,
								padding: '14px 16px',
								borderRadius: 16,
								background: `${FC.amber}10`,
								border: `1px solid ${FC.amber}25`,
							}}
						>
							<p
								style={{
									color: FC.fg,
									fontSize: 13,
									fontWeight: 600,
									margin: '0 0 6px',
								}}
							>
								Some folders couldn't be identified
							</p>
							<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 10px' }}>
								{discovery.unrecognized
									.slice(0, 3)
									.map((folder) => folder.name)
									.join(', ')}
								{discovery.unrecognized.length > 3
									? ` +${discovery.unrecognized.length - 3} more`
									: ''}
							</p>
							<button
								type="button"
								onClick={() => navigate(ROUTES.reviewDocuments)}
								style={{
									background: 'none',
									border: 'none',
									color: FC.blue,
									fontSize: 12,
									fontWeight: 700,
									cursor: 'pointer',
									fontFamily: 'inherit',
									padding: 0,
								}}
							>
								Review
							</button>
						</div>
					) : null}

					{errorMessage ? (
						<p style={{ color: FC.amber, fontSize: 13, marginTop: 14 }}>
							{errorMessage}
						</p>
					) : null}

					<div style={{ marginTop: 18 }}>
						<ActionButton
							label={isSaving ? 'Setting up…' : 'Continue'}
							disabled={isSaving}
							onClick={() => void handleContinueFromFound()}
						/>
					</div>
				</div>
			) : null}

			{step === 'ready' ? (
				<StepCard
					icon={<Check size={26} color={FC.green} />}
					title="Chronicle is ready"
					body="Chronicle will keep organizing your documents in the background. You can change your connected folder anytime from You → Connected services."
					primaryLabel="Go to Home"
					onPrimary={() => navigate(ROUTES.home)}
				/>
			) : null}
		</div>
	)
}

function StepHeading({ title, body }: { title: string; body: string }) {
	return (
		<div style={{ marginBottom: 18 }}>
			<h1
				style={{
					color: FC.fg,
					fontSize: 28,
					fontWeight: 800,
					letterSpacing: -1,
					margin: '0 0 8px',
				}}
			>
				{title}
			</h1>
			<p style={{ color: FC.mid, fontSize: 14, lineHeight: 1.55, margin: 0 }}>
				{body}
			</p>
		</div>
	)
}

function StepCard({
	icon,
	title,
	body,
	primaryLabel,
	onPrimary,
	secondaryLabel,
	onSecondary,
}: {
	icon: ReactNode
	title: string
	body: string
	primaryLabel: string
	onPrimary: () => void
	secondaryLabel?: string
	onSecondary?: () => void
}) {
	return (
		<div>
			<div
				style={{
					width: 52,
					height: 52,
					borderRadius: 16,
					background: `${FC.blue}18`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					marginBottom: 18,
				}}
			>
				{icon}
			</div>
			<StepHeading title={title} body={body} />
			<ActionButton label={primaryLabel} onClick={onPrimary} icon={Sparkles} />
			{secondaryLabel && onSecondary ? (
				<button
					type="button"
					onClick={onSecondary}
					style={{
						width: '100%',
						marginTop: 10,
						background: 'none',
						border: 'none',
						color: FC.mid,
						fontSize: 13,
						fontWeight: 600,
						cursor: 'pointer',
						fontFamily: 'inherit',
						minHeight: 44,
					}}
				>
					{secondaryLabel}
				</button>
			) : null}
		</div>
	)
}

function ActionButton({
	label,
	onClick,
	disabled = false,
	icon: Icon,
}: {
	label: string
	onClick: () => void
	disabled?: boolean
	icon?: typeof Cloud
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				width: '100%',
				minHeight: 48,
				borderRadius: 100,
				border: 'none',
				background: disabled ? `${FC.blue}55` : FC.blue,
				color: '#fff',
				fontSize: 15,
				fontWeight: 700,
				cursor: disabled ? 'not-allowed' : 'pointer',
				fontFamily: 'inherit',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 8,
			}}
		>
			{Icon ? <Icon size={16} /> : null}
			{label}
			{!Icon ? <ChevronRight size={16} /> : null}
		</button>
	)
}
