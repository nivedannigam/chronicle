import type {
	ChronicleTimelineProvider,
	TimelineProviderQuery,
} from '@/features/timeline/contracts/timeline-provider.contract'

const providers = new Map<string, ChronicleTimelineProvider>()

export function registerTimelineProvider(
	provider: ChronicleTimelineProvider,
): void {
	providers.set(provider.id, provider)
}

export function unregisterTimelineProvider(providerId: string): void {
	providers.delete(providerId)
}

export function clearTimelineProviders(): void {
	providers.clear()
}

export function getTimelineProvider(
	providerId: string,
): ChronicleTimelineProvider | undefined {
	return providers.get(providerId)
}

export function getRegisteredTimelineProviders(): ChronicleTimelineProvider[] {
	return [...providers.values()].sort(
		(left, right) => (left.priority ?? 100) - (right.priority ?? 100),
	)
}

export function getSupportingTimelineProviders(
	query: TimelineProviderQuery,
): ChronicleTimelineProvider[] {
	return getRegisteredTimelineProviders().filter((provider) =>
		provider.supports(query),
	)
}

export function getRegisteredTimelineProviderIds(): string[] {
	return [...providers.keys()]
}
