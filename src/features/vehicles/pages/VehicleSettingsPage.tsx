import { useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { VehicleModuleFolderPicker } from '@/features/vehicles/components/VehicleModuleFolderPicker'
import { useVehicleContext } from '@/features/vehicles/context/VehicleContext'
import { useVehicleSources } from '@/features/vehicles/hooks/useVehicleSources'
import {
	buildModuleProviderQuery,
	resolveModuleLibraryDocumentCount,
} from '@/core/platform/services/federated-library.service'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { runVehicleImportSync } from '@/features/vehicle-import/services/vehicle-import-runner.service'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function VehicleSettingsPage() {
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMember, selectedMemberId } = useFamilyContext()
	const { knowledge, refetch } = useVehicleContext()
	const { assignments, refresh } = useVehicleSources(userId)
	const driveConnector = useGoogleDriveConnector(userId)
	const [folderPickerOpen, setFolderPickerOpen] = useState(false)
	const [isScanning, setIsScanning] = useState(false)

	const memberAssignment = useMemo(() => {
		if (!selectedMemberId) {
			return null
		}

		return (
			assignments.find(
				(assignment) => assignment.familyMemberId === selectedMemberId,
			) ??
			assignments[0] ??
			null
		)
	}, [assignments, selectedMemberId])

	const vehicleDocumentCount = useMemo(() => {
		if (!userId || !selectedMember) {
			return 0
		}

		return resolveModuleLibraryDocumentCount({
			moduleId: 'vehicles',
			query: buildModuleProviderQuery({
				userId,
				memberNames: { [selectedMember.id]: selectedMember.displayName },
				healthReports: [],
				chronicleDocuments: [],
				insuranceKnowledge: null,
				vehicleKnowledge: knowledge,
			}),
		})
	}, [knowledge, selectedMember, userId])

	if (!userId || !selectedMember) {
		return (
			<DashboardEmptyState
				title="Choose a family member"
				message="Select who you are managing vehicle settings for."
				emoji="🚗"
			/>
		)
	}

	const handleForceRescan = async () => {
		setIsScanning(true)

		try {
			if (driveConnector.connectionStatus === 'connected') {
				await driveConnector.sync()
			} else {
				await runVehicleImportSync(userId)
			}

			await refresh()
			await refetch()
		} finally {
			setIsScanning(false)
		}
	}

	return (
		<div className="space-y-4 px-1 pb-8 pt-2">
			<div className="rounded-3xl p-5" style={figmaCardStyle}>
				<p className="text-sm text-white/55">Connected folder</p>
				<p className="mt-1 text-lg font-semibold text-white">
					{memberAssignment?.folderName ?? 'No folder connected'}
				</p>
				<p className="mt-2 text-sm text-white/60">
					{vehicleDocumentCount} document
					{vehicleDocumentCount === 1 ? '' : 's'} in Library
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => setFolderPickerOpen(true)}
						className="rounded-2xl px-4 py-2 text-sm font-semibold text-white"
						style={{ background: FC.orange }}
					>
						{memberAssignment ? 'Change folder' : 'Connect Vehicles folder'}
					</button>
					<button
						type="button"
						disabled={!memberAssignment || isScanning}
						onClick={() => void handleForceRescan()}
						className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 disabled:opacity-50"
					>
						{isScanning ? 'Checking…' : 'Check for new documents'}
					</button>
				</div>
			</div>

			<p className="text-sm text-white/50">
				Managed for {formatMemberLabel(selectedMember)}. Vehicle settings stay
				minimal — connect your folder and Chronicle handles the rest.
			</p>

			<VehicleModuleFolderPicker
				userId={userId}
				open={folderPickerOpen}
				onClose={() => setFolderPickerOpen(false)}
				onAssigned={() => {
					void refresh()
					void refetch()
				}}
			/>
		</div>
	)
}
