import { useCallback, useMemo, useState } from 'react'
import { Check, Folder, X } from 'lucide-react'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { useVehicleSources } from '@/features/vehicles/hooks/useVehicleSources'
import { discoverVehicleNamesFromFolderNames } from '@/features/vehicles/services/vehicle-folder-discovery.service'
import { useDriveBrowser } from '@/features/connectors/google-drive/hooks/useDriveBrowser'
import { runVehicleImportSync } from '@/features/vehicle-import/services/vehicle-import-runner.service'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function VehicleModuleFolderPicker({
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
	const { assignFolder } = useVehicleSources(userId)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const memberLabel = selectedMember ? formatMemberLabel(selectedMember) : 'you'

	const discoveredVehicles = useMemo(
		() =>
			discoverVehicleNamesFromFolderNames(browser.folders.map((f) => f.name)),
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
				discoveredVehicleNames: discoveredVehicles,
				mode: 'replace',
			})
			await runVehicleImportSync(userId)
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
		discoveredVehicles,
		memberLabel,
		onAssigned,
		onClose,
		selectedMember,
		userId,
	])

	if (!open) {
		return null
	}

	return (
		<div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/65">
			<div
				className="flex max-h-[88vh] flex-col rounded-t-3xl px-4 pb-6 pt-4"
				style={{ background: FC.bg }}
			>
				<div className="mb-3 flex items-start justify-between gap-3">
					<div>
						<p className="text-lg font-bold text-white">
							Choose Vehicles folder
						</p>
						<p className="mt-1 text-sm text-white/55">
							Connect your root Vehicles folder for {memberLabel}. Chronicle
							scans nested vehicle folders recursively.
						</p>
					</div>
					<button type="button" onClick={onClose} aria-label="Close">
						<X size={16} color={FC.mid} />
					</button>
				</div>

				{discoveredVehicles.length > 0 ? (
					<div
						className="mb-3 rounded-2xl border p-3"
						style={{
							background: `${FC.orange}12`,
							borderColor: `${FC.orange}28`,
						}}
					>
						<p className="text-sm font-semibold text-white">Vehicles found</p>
						<div className="mt-2 flex flex-wrap gap-2">
							{discoveredVehicles.map((name) => (
								<span
									key={name}
									className="inline-flex items-center gap-1 text-xs font-semibold text-white/70"
								>
									<Check size={14} color={FC.green} />
									{name}
								</span>
							))}
						</div>
					</div>
				) : null}

				<div
					className="min-h-0 flex-1 overflow-y-auto rounded-2xl p-3"
					style={figmaCardStyle}
				>
					<p className="mb-2 text-sm text-white/60">
						Current folder: {browser.currentFolderName || 'Select a folder'}
					</p>
					{browser.folders.map((folder) => (
						<button
							key={folder.id}
							type="button"
							onClick={() => browser.openFolder(folder.id)}
							className="mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-white/80 hover:bg-white/5"
						>
							<Folder size={16} />
							{folder.name}
						</button>
					))}
				</div>

				{error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

				<button
					type="button"
					disabled={isSaving || !browser.currentFolderId}
					onClick={() => void handleSelectFolder()}
					className="mt-4 rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-50"
					style={{ background: FC.orange }}
				>
					{isSaving ? 'Connecting…' : 'Use this folder'}
				</button>
			</div>
		</div>
	)
}
