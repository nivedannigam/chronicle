import { useCallback, useState } from 'react'
import { Check, Folder, X } from 'lucide-react'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { useIdentitySources } from '@/features/identity/hooks/useIdentitySources'
import { runIdentityImportSync } from '@/features/identity-import/services/identity-import-runner.service'
import { useDriveBrowser } from '@/features/connectors/google-drive/hooks/useDriveBrowser'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'
import { C } from '@/constants/colors'

export function IdentityModuleFolderPicker({
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
	const { selectedMember, accountOwnerMemberId, members } = useFamilyContext()
	const browser = useDriveBrowser(userId)
	const { assignFolder } = useIdentitySources(userId)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const targetMember = selectedMember ?? members[0] ?? null

	const handleSelectFolder = useCallback(async () => {
		if (!targetMember || !browser.currentFolderId) {
			return
		}

		setIsSaving(true)
		setError(null)

		try {
			await assignFolder({
				externalFolderId: browser.currentFolderId,
				folderName: browser.currentFolderName,
				folderPath: browser.currentFolderName,
				familyMemberId: accountOwnerMemberId ?? targetMember.id,
				familyMemberName: targetMember.displayName,
				memberLabel: formatMemberLabel(targetMember),
				mode: 'replace',
			})
			await runIdentityImportSync(userId)
			onAssigned?.()
			onClose()
		} catch {
			setError('We could not connect this folder yet. Try again.')
		} finally {
			setIsSaving(false)
		}
	}, [
		accountOwnerMemberId,
		assignFolder,
		browser.currentFolderId,
		browser.currentFolderName,
		onAssigned,
		onClose,
		targetMember,
		userId,
	])

	if (!open) {
		return null
	}

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.72)',
				zIndex: 100,
				display: 'flex',
				alignItems: 'flex-end',
				justifyContent: 'center',
			}}
		>
			<div
				style={{
					width: '100%',
					maxWidth: 480,
					maxHeight: '85vh',
					background: FC.bg,
					borderTopLeftRadius: 24,
					borderTopRightRadius: 24,
					padding: '18px 18px 24px',
					overflow: 'auto',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: 16,
					}}
				>
					<p style={{ color: FC.fg, fontSize: 16, fontWeight: 700, margin: 0 }}>
						Connect Identity folder
					</p>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							color: FC.mid,
							cursor: 'pointer',
						}}
					>
						<X size={18} />
					</button>
				</div>

				<p style={{ color: FC.dim, fontSize: 13, margin: '0 0 16px' }}>
					Choose the root Identity folder. Chronicle will organize documents
					inside nested folders too.
				</p>

				<div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
					{browser.folders.map((folder) => (
						<button
							key={folder.id}
							type="button"
							onClick={() => browser.openFolder(folder.id)}
							style={{
								...figmaCardStyle,
								borderRadius: 16,
								padding: '12px 14px',
								display: 'flex',
								alignItems: 'center',
								gap: 10,
								cursor: 'pointer',
								fontFamily: 'inherit',
								textAlign: 'left',
							}}
						>
							<Folder size={16} color={C.accentBlue} />
							<span style={{ color: FC.fg, fontSize: 14 }}>{folder.name}</span>
						</button>
					))}
				</div>

				<div
					style={{
						...figmaCardStyle,
						borderRadius: 16,
						padding: '12px 14px',
						marginBottom: 16,
					}}
				>
					<p style={{ color: FC.mid, fontSize: 12, margin: '0 0 4px' }}>
						Selected folder
					</p>
					<p style={{ color: FC.fg, fontSize: 14, fontWeight: 600, margin: 0 }}>
						{browser.currentFolderName}
					</p>
				</div>

				{error ? (
					<p style={{ color: FC.red, fontSize: 13, marginBottom: 12 }}>
						{error}
					</p>
				) : null}

				<button
					type="button"
					disabled={isSaving || !browser.currentFolderId}
					onClick={() => void handleSelectFolder()}
					style={{
						width: '100%',
						background: C.accentBlue,
						color: '#fff',
						border: 'none',
						borderRadius: 18,
						padding: '14px 18px',
						fontSize: 14,
						fontWeight: 700,
						cursor: 'pointer',
						opacity: isSaving ? 0.7 : 1,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 8,
					}}
				>
					<Check size={16} />
					{isSaving ? 'Connecting…' : 'Use this folder'}
				</button>
			</div>
		</div>
	)
}
