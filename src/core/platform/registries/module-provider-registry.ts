import type { ChronicleModuleProvider } from '@/core/platform/contracts/module-provider.contract'

const providers = new Map<string, ChronicleModuleProvider>()

export function registerModuleProvider(
	provider: ChronicleModuleProvider,
): void {
	providers.set(provider.moduleId, provider)
}

export function unregisterModuleProvider(moduleId: string): void {
	providers.delete(moduleId)
}

export function clearModuleProviders(): void {
	providers.clear()
}

export function getModuleProvider(
	moduleId: string,
): ChronicleModuleProvider | undefined {
	return providers.get(moduleId)
}

export function getRegisteredModuleProviders(): ChronicleModuleProvider[] {
	return [...providers.values()].sort(
		(left, right) => left.priority - right.priority,
	)
}

export function getRegisteredModuleProviderIds(): string[] {
	return getRegisteredModuleProviders().map((provider) => provider.moduleId)
}
