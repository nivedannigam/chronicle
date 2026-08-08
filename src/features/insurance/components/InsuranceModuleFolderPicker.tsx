import { useCallback, useMemo, useState } from 'react'
import {
	ChevronLeft,
	Check,
	File,
	FileImage,
	FileText,
	Folder,
	X,
} from 'lucide-react'
import { C } from '@/constants/colors'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { useInsuranceSources } from '@/features/insurance/hooks/useInsuranceSources'
import { discoverInsuranceCategoriesFromFolderNames } from '@/features/insurance/services/insurance-folder-discovery.service'
import { useDriveBrowser } from '@/features/connectors/google-drive/hooks/useDriveBrowser'
import type { DriveBrowseFile } from '@/core/connectors'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function InsuranceModuleFolderPicker({
	userId,
	open,
	onClose,
	onAssigned,
}: {
	userId: string
	open: boolean
	onClose: () => void
	onAssigned?: () => void
}) {
	const { selectedMember } = useFamilyContext()
	const browser = useDriveBrowser(userId)
	const { assignFolder } = useInsuranceSources(userId)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const memberLabel = selectedMember ? formatMemberLabel(selectedMember) : 'you'

	const discoveredCategories = useMemo(
		() =>
			discoverInsuranceCategoriesFromFolderNames(
				browser.folders.map((folder) => folder.name),
			),
		[browser.folders],
	)

	const handleSelectFolder = useCallback(async () => {
		if (!selectedMember || !browser.currentFolderId) {
			return
		}

		setIsSaving(true)
		setError(null)

		try {
			await assignFolder({
				externalFolderId: browser.currentFolderId,
				folderName: browser.currentFolderName,
				folderPath: browser.currentFolderName,
				familyMemberId: selectedMember.id,
				familyMemberName: selectedMember.displayName,
				memberLabel,
				discoveredCategories: discoveredCategories.map(
					(category) => category.id,
				),
				mode: 'replace',
			})
			onAssigned?.()
			onClose()
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: 'Could not assign this folder.',
			)
		} finally {
			setIsSaving(false)
		}
	}, [
		assignFolder,
		browser.currentFolderId,
		browser.currentFolderName,
		memberLabel,
		discoveredCategories,
		onAssigned,
		onClose,
		selectedMember,
	])

	if (!open) {
		return null
	}

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 50,
				background: 'rgba(0,0,0,0.65)',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-end',
			}}
		>
			<div
				style={{
					background: FC.bg,
					borderTopLeftRadius: 24,
					borderTopRightRadius: 24,
					maxHeight: '88vh',
					display: 'flex',
					flexDirection: 'column',
					padding: '16px 18px calc(18px + env(safe-area-inset-bottom))',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: 12,
					}}
				>
					<div>
						<p
							style={{
								color: FC.fg,
								fontSize: 17,
								fontWeight: 700,
								margin: '0 0 4px',
							}}
						>
							Choose insurance folder
						</p>
						<p style={{ color: FC.mid, fontSize: 12.5, margin: 0 }}>
							Select your root Insurance folder for {memberLabel}. Chronicle
							discovers Health, Vehicle, Home, and Life subfolders
							automatically.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						style={{
							background: FC.ghost,
							border: `1px solid ${FC.line}`,
							borderRadius: 12,
							padding: 8,
							cursor: 'pointer',
						}}
					>
						<X size={16} color={FC.mid} />
					</button>
				</div>

				{discoveredCategories.length > 0 ? (
					<div
						style={{
							marginBottom: 12,
							padding: '12px 14px',
							borderRadius: 16,
							background: `${FC.blue}12`,
							border: `1px solid ${FC.blue}28`,
						}}
					>
						<p
							style={{
								color: FC.fg,
								fontSize: 13,
								fontWeight: 600,
								margin: '0 0 8px',
							}}
						>
							Categories found
						</p>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
							{discoveredCategories.map((category) => (
								<span
									key={category.id}
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										gap: 6,
										color: FC.mid,
										fontSize: 12.5,
										fontWeight: 600,
									}}
								>
									<Check size={14} color={FC.green} />
									{category.emoji} {category.label}
								</span>
							))}
						</div>
					</div>
				) : null}

				<div
					style={{
						...figmaCardStyle,
						borderRadius: 18,
						padding: 14,
						flex: 1,
						minHeight: 0,
						overflowY: 'auto',
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							marginBottom: 12,
						}}
					>
						<button
							type="button"
							onClick={() => browser.goBack()}
							disabled={!browser.parentFolderId}
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 6,
								background: 'none',
								border: 'none',
								color: FC.mid,
								cursor: !browser.parentFolderId ? 'default' : 'pointer',
								opacity: !browser.parentFolderId ? 0.4 : 1,
								fontFamily: 'inherit',
								fontSize: 13,
								fontWeight: 600,
								padding: 0,
							}}
						>
							<ChevronLeft size={16} />
							Back
						</button>
						<span style={{ color: FC.dim, fontSize: 12 }}>
							{browser.currentFolderName}
						</span>
					</div>

					{browser.isLoading ? (
						<p style={{ color: FC.dim, fontSize: 13 }}>Loading folders…</p>
					) : (
						<div style={{ display: 'grid', gap: 8 }}>
							{browser.folders.map((folder) => (
								<FolderRow
									key={folder.id}
									name={folder.name}
									onOpen={() => browser.openFolder(folder.id)}
								/>
							))}
							{browser.files.slice(0, 8).map((file) => (
								<FileRow key={file.id} file={file} />
							))}
						</div>
					)}
				</div>

				{error ? (
					<p style={{ color: FC.orange, fontSize: 12.5, margin: '10px 0 0' }}>
						{error}
					</p>
				) : null}

				<button
					type="button"
					onClick={() => void handleSelectFolder()}
					disabled={isSaving || !browser.currentFolderId}
					style={{
						marginTop: 14,
						width: '100%',
						background: FC.blue,
						color: '#fff',
						border: 'none',
						borderRadius: 14,
						padding: '12px 16px',
						fontFamily: 'inherit',
						fontWeight: 700,
						fontSize: 14,
						cursor: isSaving ? 'wait' : 'pointer',
						opacity: isSaving ? 0.7 : 1,
					}}
				>
					{isSaving
						? 'Saving…'
						: `Use "${browser.currentFolderName}" as Insurance folder`}
				</button>
			</div>
		</div>
	)
}

function FolderRow({ name, onOpen }: { name: string; onOpen: () => void }) {
	return (
		<button
			type="button"
			onClick={onOpen}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				width: '100%',
				background: C.card2,
				border: `1px solid ${C.border}`,
				borderRadius: 12,
				padding: '10px 12px',
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<Folder size={16} color={FC.amber} />
			<span style={{ color: FC.fg, fontSize: 13.5, fontWeight: 600 }}>
				{name}
			</span>
		</button>
	)
}

function FileRow({ file }: { file: DriveBrowseFile }) {
	const Icon = useMemo(() => {
		if (file.mimeType.includes('pdf')) {
			return FileText
		}

		if (file.mimeType.includes('image')) {
			return FileImage
		}

		return File
	}, [file.mimeType])

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				padding: '8px 12px',
				opacity: 0.65,
			}}
		>
			<Icon size={15} color={FC.dim} />
			<span style={{ color: FC.mid, fontSize: 12.5 }}>{file.name}</span>
		</div>
	)
}
