import { ROUTES } from '@/constants/routes'
import type { ChroniclePlatformModule } from '@/core/platform/contracts/platform-module.contract'
import { registerPlatformModule } from '@/core/platform/registries/module-registry'
import { registerDocumentConsumer } from '@/core/platform/registries/document-registry'

const healthModule: ChroniclePlatformModule = {
	id: 'health',
	label: 'Health',
	knowledgeDomain: 'health',
	routePrefix: '/health',
	enabled: true,
	timelineModule: 'health',
	settingsPath: ROUTES.healthSettings,
	askPath: ROUTES.healthAsk,
	documentsCategoryIds: ['medical'],
}

const healthDocumentConsumer = {
	moduleId: 'health' as const,
	label: 'Health',
	categoryIds: ['medical'],
}

export function registerHealthPlatformModule(): void {
	registerPlatformModule(healthModule)
	registerDocumentConsumer(healthDocumentConsumer)
}

export { healthModule }
