import { registerHealthPlatformModule } from '@/core/platform/modules/register-health.module'
import { registerInsurancePlatformModule } from '@/core/platform/modules/register-insurance.module'

export function registerPlatformModules(): void {
	registerHealthPlatformModule()
	registerInsurancePlatformModule()
}
