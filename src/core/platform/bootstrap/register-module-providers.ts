import { healthModuleProvider } from '@/core/platform/providers/health-module.provider'
import { identityModuleProvider } from '@/core/platform/providers/identity-module.provider'
import { insuranceModuleProvider } from '@/core/platform/providers/insurance-module.provider'
import { vehiclesModuleProvider } from '@/core/platform/providers/vehicles-module.provider'
import { financeModuleProvider } from '@/core/platform/providers/finance-module.provider'
import { propertyModuleProvider } from '@/core/platform/providers/property-module.provider'
import { documentsModuleProvider } from '@/core/platform/providers/documents-module.provider'
import {
	registerModuleProvider,
	getRegisteredModuleProviders,
} from '@/core/platform/registries/module-provider-registry'

let registered = false

export function registerModuleProviders(): void {
	if (registered && getRegisteredModuleProviders().length > 0) {
		return
	}

	registered = true

	for (const provider of [
		healthModuleProvider,
		identityModuleProvider,
		insuranceModuleProvider,
		vehiclesModuleProvider,
		financeModuleProvider,
		propertyModuleProvider,
		documentsModuleProvider,
	]) {
		registerModuleProvider(provider)
	}
}

export function resetModuleProviderRegistrationGuard(): void {
	registered = false
}
