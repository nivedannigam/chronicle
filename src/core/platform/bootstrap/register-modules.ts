import { registerHealthPlatformModule } from '@/core/platform/modules/register-health.module'
import { registerInsurancePlatformModule } from '@/core/platform/modules/register-insurance.module'
import { registerVehiclesPlatformModule } from '@/core/platform/modules/register-vehicles.module'

export function registerPlatformModules(): void {
	registerHealthPlatformModule()
	registerInsurancePlatformModule()
	registerVehiclesPlatformModule()
}
