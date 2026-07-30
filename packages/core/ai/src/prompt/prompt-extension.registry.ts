import type { PromptBuildInput } from './prompt.types.ts'

export interface PromptExtension {
	readonly id: string
	readonly domains?: string[]
	systemPromptSections?: readonly string[]
	outputSchemaAdditions?: string
	shouldApply?: (input: PromptBuildInput) => boolean
	postProcessAnswer?: (answer: string, input: PromptBuildInput) => string
}

const extensions: PromptExtension[] = []

export function registerPromptExtension(
	extension: PromptExtension,
): () => void {
	extensions.push(extension)

	return () => {
		const index = extensions.indexOf(extension)

		if (index >= 0) {
			extensions.splice(index, 1)
		}
	}
}

export function getPromptExtensions(): PromptExtension[] {
	return [...extensions]
}

export function clearPromptExtensions(): void {
	extensions.length = 0
}

export function getApplicablePromptExtensions(
	input: PromptBuildInput,
): PromptExtension[] {
	return getPromptExtensions().filter((extension) => {
		if (extension.shouldApply) {
			return extension.shouldApply(input)
		}

		if (!extension.domains?.length || !input.activeDomains?.length) {
			return false
		}

		return extension.domains.some((domain) =>
			input.activeDomains!.includes(domain),
		)
	})
}

export function applyPromptPostProcessing(
	answer: string,
	input: PromptBuildInput,
): string {
	let result = answer

	for (const extension of getApplicablePromptExtensions(input)) {
		if (extension.postProcessAnswer) {
			result = extension.postProcessAnswer(result, input)
		}
	}

	return result
}
