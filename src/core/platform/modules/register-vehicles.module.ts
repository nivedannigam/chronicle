import { ROUTES } from '@/constants/routes'
import type { ChroniclePlatformModule } from '@/core/platform/contracts/platform-module.contract'
import { registerPlatformModule } from '@/core/platform/registries/module-registry'
import { registerDocumentConsumer } from '@/core/platform/registries/document-registry'

const vehiclesModule: ChroniclePlatformModule = {
	id: 'vehicles',
	label: 'Vehicles',
	knowledgeDomain: 'vehicles',
	routePrefix: '/vehicles',
	enabled: true,
	timelineModule: 'vehicles',
	settingsPath: ROUTES.vehiclesSettings,
	askPath: ROUTES.vehiclesAsk,
	documentsCategoryIds: ['vehicles'],
}

const vehiclesDocumentConsumer = {
	moduleId: 'vehicles' as const,
	label: 'Vehicles',
	categoryIds: ['vehicles'],
}

export function registerVehiclesPlatformModule(): void {
	registerPlatformModule(vehiclesModule)
	registerDocumentConsumer(vehiclesDocumentConsumer)
}

export { vehiclesModule }
