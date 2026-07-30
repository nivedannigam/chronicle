import { describe, expect, it } from 'vitest'
import {
	clearPromptExtensions,
	registerPromptExtension,
} from './prompt-extension.registry.ts'
import { promptBuilder } from './prompt-builder.ts'

describe('PromptBuilder', () => {
	it('builds base prompt without domain extensions', () => {
		clearPromptExtensions()

		const built = promptBuilder.build({
			question: 'What documents do I have?',
			contextJson: '{"documents":[]}',
			dataAvailable: false,
			memberName: 'Alex',
			conversationHistory: [],
			activeDomains: ['documents'],
		})

		expect(built.system).toContain('Chronicle')
		expect(built.system).not.toContain('not medical advice')
		expect(built.user).toContain('Alex')
	})

	it('composes registered domain extensions', () => {
		clearPromptExtensions()
		registerPromptExtension({
			id: 'test-health',
			domains: ['health'],
			systemPromptSections: ['TEST MEDICAL SAFETY SECTION'],
		})

		const built = promptBuilder.build({
			question: 'How is my cholesterol?',
			contextJson: '{"metrics":[]}',
			dataAvailable: true,
			memberName: 'Alex',
			conversationHistory: [],
			activeDomains: ['health'],
		})

		expect(built.system).toContain('TEST MEDICAL SAFETY SECTION')
	})
})
