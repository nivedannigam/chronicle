import type { AskScopeContext } from '@/features/ask/services/knowledge-query.interface'

const ASK_CONTEXT_COPY: Record<
	NonNullable<AskScopeContext['contextModule']>,
	{ subtitle: string; emptyHeadline: string }
> = {
	health: {
		subtitle: 'Your health companion',
		emptyHeadline: 'Ask anything about your health records.',
	},
	insurance: {
		subtitle: 'Your insurance companion',
		emptyHeadline: 'Ask anything about your policies and coverage.',
	},
	vehicles: {
		subtitle: 'Your vehicles companion',
		emptyHeadline: 'Ask anything about your vehicles and documents.',
	},
	identity: {
		subtitle: 'Your identity companion',
		emptyHeadline: 'Ask anything about your identity documents.',
	},
	finance: {
		subtitle: 'Your finance companion',
		emptyHeadline: 'Ask anything about your financial records.',
	},
	property: {
		subtitle: 'Your property companion',
		emptyHeadline: 'Ask anything about your home and property records.',
	},
}

export function resolveAskContextCopy(
	contextModule?: AskScopeContext['contextModule'],
): { subtitle: string; emptyHeadline: string } {
	if (!contextModule) {
		return {
			subtitle: 'Ask Chronicle about your life records',
			emptyHeadline:
				'Ask anything about Health, Insurance, Vehicles, Identity, Finance, or Property.',
		}
	}

	return ASK_CONTEXT_COPY[contextModule]
}
