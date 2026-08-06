import { ROUTES } from '@/constants/routes'
import type { ChroniclePlatformModule } from '@/core/platform/contracts/platform-module.contract'
import { registerPlatformModule } from '@/core/platform/registries/module-registry'
import { registerDocumentConsumer } from '@/core/platform/registries/document-registry'

const insuranceModule: ChroniclePlatformModule = {
	id: 'insurance',
	label: 'Insurance',
	knowledgeDomain: 'insurance',
	routePrefix: '/insurance',
	enabled: true,
	timelineModule: 'insurance',
	settingsPath: ROUTES.insuranceSettings,
	askPath: ROUTES.insuranceAsk,
	documentsCategoryIds: ['insurance'],
}

const insuranceDocumentConsumer = {
	moduleId: 'insurance' as const,
	label: 'Insurance',
	categoryIds: ['insurance'],
}

export function registerInsurancePlatformModule(): void {
	registerPlatformModule(insuranceModule)
	registerDocumentConsumer(insuranceDocumentConsumer)
}

export { insuranceModule }
