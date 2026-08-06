import type { ChronicleDocumentConsumer } from '@/core/platform/contracts/document-platform.contract'

const consumers = new Map<string, ChronicleDocumentConsumer>()

export function registerDocumentConsumer(
	consumer: ChronicleDocumentConsumer,
): void {
	consumers.set(consumer.moduleId, consumer)
}

export function unregisterDocumentConsumer(moduleId: string): void {
	consumers.delete(moduleId)
}

export function clearDocumentConsumers(): void {
	consumers.clear()
}

export function getRegisteredDocumentConsumers(): ChronicleDocumentConsumer[] {
	return [...consumers.values()].sort((left, right) =>
		left.label.localeCompare(right.label),
	)
}

export function getDocumentConsumer(
	moduleId: string,
): ChronicleDocumentConsumer | undefined {
	return consumers.get(moduleId)
}
