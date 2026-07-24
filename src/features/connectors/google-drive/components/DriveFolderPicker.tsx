import { ChevronLeft, Folder, FolderPlus } from 'lucide-react'
import { C } from '@/constants/colors'
import { useDriveFolderPicker } from '@/features/connectors/google-drive/hooks/useDriveFolderPicker'
import type { ConnectorFolder } from '@/core/connectors'

interface DriveFolderPickerProps {
	userId: string
	selectedFolders: ConnectorFolder[]
	onFolderSaved: () => void
}

export function DriveFolderPicker({
	userId,
	selectedFolders,
	onFolderSaved,
}: DriveFolderPickerProps) {
	const picker = useDriveFolderPicker(userId, selectedFolders)

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				padding: 16,
				marginBottom: 20,
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 14,
				}}
			>
				<div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
					Select Health Folders
				</div>
				{picker.parentFolderId ? (
					<button
						type="button"
						onClick={() => void picker.loadFolder(picker.parentFolderId!)}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 4,
							background: 'none',
							border: 'none',
							color: C.textSec,
							cursor: 'pointer',
							fontFamily: 'inherit',
							fontSize: 12,
						}}
					>
						<ChevronLeft size={14} />
						Back
					</button>
				) : null}
			</div>

			<div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
				Browsing: {picker.currentFolderName}
			</div>

			{picker.error ? (
				<div style={{ fontSize: 12, color: C.red, marginBottom: 12 }}>
					{picker.error}
				</div>
			) : null}

			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{picker.isLoading ? (
					<div style={{ fontSize: 13, color: C.textMuted }}>
						Loading folders…
					</div>
				) : (
					picker.folders.map((folder) => {
						const selected = picker.isSelected(folder.id)

						return (
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
								}}
							>
								<button
									type="button"
									onClick={() => void picker.loadFolder(folder.id)}
									style={{
										flex: 1,
										display: 'flex',
										alignItems: 'center',
										gap: 10,
										background: 'none',
										border: 'none',
										cursor: 'pointer',
										textAlign: 'left',
										fontFamily: 'inherit',
										color: C.text,
									}}
								>
									<Folder size={18} color={C.accentBlue} />
									<span style={{ fontSize: 14, fontWeight: 600 }}>
										{folder.name}
									</span>
								</button>
								<button
									type="button"
									disabled={selected}
									onClick={() => {
										void picker.selectFolder(folder).then(onFolderSaved)
									}}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 4,
										background: selected ? C.card : C.accentDim,
										border: `1px solid ${selected ? C.border : 'rgba(108,111,255,0.25)'}`,
										borderRadius: 100,
										padding: '6px 10px',
										fontSize: 11,
										color: selected ? C.textMuted : C.accent,
										cursor: selected ? 'default' : 'pointer',
										fontFamily: 'inherit',
									}}
								>
									<FolderPlus size={12} />
									{selected ? 'Added' : 'Add'}
								</button>
							</div>
						)
					})
				)}
			</div>
		</div>
	)
}
