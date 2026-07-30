import { registerPromptExtension } from '@chronicle/core-ai'
import { healthPromptExtension } from '@/features/health/prompt/health-prompt.extension'

let registered = false

export function registerHealthPromptExtensions(): void {
	if (registered) {
		return
	}

	registerPromptExtension(healthPromptExtension)
	registered = true
}
