import { describe, expect, it } from 'vitest'
import {
	classifyGeminiFailure,
	mapErrorToUserMessage,
} from '@/shared/ai/errors/ai-errors'

describe('classifyGeminiFailure', () => {
	it('maps prepay credit depletion on 429 to billing guidance', () => {
		const result = classifyGeminiFailure({
			statusCode: 429,
			message: 'Resource exhausted',
			providerResponse:
				'{"error":{"message":"Prepayment credits depleted. Visit Google AI Studio billing."}}',
		})

		expect(result.kind).toBe('billing')
		expect(result.userMessage).toMatch(/prepay credits are depleted/i)
	})

	it('maps generic 429 responses to rate limit guidance', () => {
		const result = classifyGeminiFailure({
			statusCode: 429,
			message: 'Rate limit exceeded',
		})

		expect(result.kind).toBe('rate_limit')
		expect(result.userMessage).toMatch(/rate limit/i)
	})

	it('maps missing model responses to model-not-found guidance', () => {
		const result = classifyGeminiFailure({
			statusCode: 404,
			message: 'Model gemini-unknown not found',
		})

		expect(result.kind).toBe('model_not_found')
		expect(result.userMessage).toMatch(/model is not available/i)
	})

	it('maps auth failures to sign-in guidance', () => {
		const result = classifyGeminiFailure({
			statusCode: 401,
			message: 'Unauthorized',
		})

		expect(result.kind).toBe('auth')
		expect(result.userMessage).toMatch(/sign in again/i)
	})
})

describe('mapErrorToUserMessage', () => {
	it('uses provider response details from edge invoke errors', () => {
		const message = mapErrorToUserMessage(
			Object.assign(new Error('Ask AI edge function failed'), {
				statusCode: 429,
				providerResponse: 'Prepayment credits depleted',
			}),
		)

		expect(message).toMatch(/prepay credits are depleted/i)
	})
})
