import { describe, expect, it } from 'vitest'
import {
	CHRONICLE_HEALTH_DEVELOPER_PROMPT,
	CHRONICLE_HEALTH_SYSTEM_PROMPT,
	HEALTH_SUMMARIZE_OUTPUT_SCHEMA,
} from '@/shared/ai/prompt/prompt-templates'

describe('prompt-templates', () => {
	it('instructs physician-style conversational answers', () => {
		expect(CHRONICLE_HEALTH_SYSTEM_PROMPT).toContain(
			'already reviewed this patient',
		)
		expect(CHRONICLE_HEALTH_SYSTEM_PROMPT).toContain('NEVER mention')
		expect(CHRONICLE_HEALTH_SYSTEM_PROMPT).not.toContain('SelectedEvidence')
	})

	it('maps question types to answer shape', () => {
		expect(CHRONICLE_HEALTH_DEVELOPER_PROMPT).toContain('STATUS_OVERVIEW')
		expect(CHRONICLE_HEALTH_DEVELOPER_PROMPT).toContain('FACT_LOOKUP')
		expect(CHRONICLE_HEALTH_DEVELOPER_PROMPT).toContain('Overall Assessment')
	})

	it('forbids robotic phrasing and metric dumps', () => {
		expect(CHRONICLE_HEALTH_DEVELOPER_PROMPT).toContain(
			'NOT raw "Test: value unit" lines',
		)
		expect(CHRONICLE_HEALTH_DEVELOPER_PROMPT).toContain('Based on your reports')
	})

	it('requires contextual follow-up questions', () => {
		expect(CHRONICLE_HEALTH_DEVELOPER_PROMPT).toContain(
			'NEVER suggest "Explain LDL"',
		)
		expect(CHRONICLE_HEALTH_DEVELOPER_PROMPT).toContain(
			'Overall your heart health looks good',
		)
	})

	it('describes overall assessment in output schema', () => {
		expect(HEALTH_SUMMARIZE_OUTPUT_SCHEMA).toContain('Overall Assessment')
		expect(HEALTH_SUMMARIZE_OUTPUT_SCHEMA).toContain('followUpQuestions')
	})
})
