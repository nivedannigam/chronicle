import type { ChronicleInsightsProvider } from '@/features/health-insights/contracts/insights-provider.contract'

const providers = new Map<string, ChronicleInsightsProvider>()

export function registerInsightsProvider(
	provider: ChronicleInsightsProvider,
): void {
	providers.set(provider.id, provider)
}

export function getRegisteredInsightsProviders(): ChronicleInsightsProvider[] {
	return [...providers.values()]
}

export function clearInsightsProviders(): void {
	providers.clear()
}
