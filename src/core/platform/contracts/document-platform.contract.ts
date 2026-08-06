import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { PlatformModuleId } from '@/core/platform/contracts/platform-module.contract'

/** Modules declare how they consume documents from the canonical library. */
export interface ChronicleDocumentConsumer {
	readonly moduleId: PlatformModuleId
	readonly label: string
	readonly categoryIds?: string[]
	readonly subCategoryIds?: string[]

	matchesDocument?(document: ChronicleDocument): boolean
}
