import { useNavigate } from 'react-router-dom'
import { getActiveLifeModules, getComingSoonModules } from '@/constants/modules'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useHealthSources } from '@/features/family/hooks/useHealthSources'
import { useFederatedLibrary } from '@/features/documents/hooks/useFederatedLibrary'
import { useInsuranceSources } from '@/features/insurance/hooks/useInsuranceSources'
import { useVehicleSources } from '@/features/vehicles/hooks/useVehicleSources'
import { FigmaScreenHeader } from '@/ui/figma/shell/FigmaScreenHeader'
import {
	ModuleComingSoonCard,
	ModuleLauncherCard,
} from '@/ui/figma/modules/module-ui'
import { FC, FigmaLbl } from '@/ui/figma/v2/atoms'

function isModuleConnected(
	moduleId: string,
	input: {
		healthCount: number
		insuranceCount: number
		vehicleCount: number
		driveConnected: boolean
	},
): boolean {
	if (!input.driveConnected) {
		return false
	}

	switch (moduleId) {
		case 'health':
			return input.healthCount > 0
		case 'insurance':
			return input.insuranceCount > 0
		case 'vehicles':
			return input.vehicleCount > 0
		default:
			return false
	}
}

export function FigmaModulesScreen() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const federated = useFederatedLibrary()
	const drive = useGoogleDriveConnector(userId)
	const { assignments: healthAssignments } = useHealthSources(userId)
	const { assignments: insuranceAssignments } = useInsuranceSources(userId)
	const { moduleAssignments: vehicleAssignments } = useVehicleSources(userId)
	const activeModules = getActiveLifeModules()
	const comingSoonModules = getComingSoonModules()

	const documentCountByModule = new Map<string, number>(
		federated.moduleSummaries.map((summary) => [
			summary.moduleId,
			summary.documentCount,
		]),
	)

	const driveConnected = drive.connectionStatus === 'connected'

	return (
		<div style={{ padding: '0 22px 24px' }}>
			<FigmaScreenHeader
				title="Modules"
				subtitle="These are the things Chronicle can manage for you"
				paddingBottom={22}
			/>

			<div style={{ marginBottom: 22 }}>
				<div style={{ marginBottom: 12 }}>
					<FigmaLbl>Active</FigmaLbl>
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{activeModules.map((module) => {
						const connected = isModuleConnected(module.id, {
							healthCount: healthAssignments.length,
							insuranceCount: insuranceAssignments.length,
							vehicleCount: vehicleAssignments.length,
							driveConnected,
						})

						return (
							<ModuleLauncherCard
								key={module.id}
								module={{
									...module,
									description: connected
										? module.description
										: 'Set up to connect your folder',
								}}
								documentCount={documentCountByModule.get(module.id)}
								onClick={() => {
									if (!connected) {
										navigate(ROUTES.setup)
										return
									}

									if (module.route) {
										navigate(module.route)
									}
								}}
							/>
						)
					})}
				</div>
			</div>

			<div style={{ marginBottom: 22 }}>
				<div style={{ marginBottom: 12 }}>
					<FigmaLbl>Coming Soon</FigmaLbl>
				</div>
				<div
					style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
				>
					{comingSoonModules.map((module) => (
						<ModuleComingSoonCard key={module.id} module={module} />
					))}
				</div>
			</div>

			<p style={{ color: FC.dim, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
				Looking for all your files? Open Library from the bottom navigation.
			</p>
		</div>
	)
}

/** @deprecated Use FigmaModulesScreen */
export const FigmaMoreScreen = FigmaModulesScreen
