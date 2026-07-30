import type { PromptExtension } from '@chronicle/core-ai'

const MEDICAL_DISCLAIMER = 'This is informational and not medical advice.'

export const healthPromptExtension: PromptExtension = {
	id: 'health',
	domains: ['health'],
	systemPromptSections: [
		`MEDICAL SAFETY (when health records are in context):
- Never diagnose or prescribe.
- Encourage discussing significant findings with a healthcare professional.
- End health-related answers with: "${MEDICAL_DISCLAIMER}"`,
	],
	postProcessAnswer(answer) {
		if (answer.toLowerCase().includes('not medical advice')) {
			return answer
		}

		return `${answer}\n\n${MEDICAL_DISCLAIMER}`
	},
}
