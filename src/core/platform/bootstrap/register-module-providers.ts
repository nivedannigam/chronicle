import { healthModuleProvider } from '@/core/platform/providers/health-module.provider'
import { insuranceModuleProvider } from '@/core/platform/providers/insurance-module.provider'
import { vehiclesModuleProvider } from '@/core/platform/providers/vehicles-module.provider'
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
		insuranceModuleProvider,
		vehiclesModuleProvider,
		documentsModuleProvider,
	]) {
		registerModuleProvider(provider)
	}
}

export function resetModuleProviderRegistrationGuard(): void {
	registered = false
}
