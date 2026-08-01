import { describe, expect, it } from 'vitest'
import {
	formatOcrRuntimeError,
	isOcrConfigurationError,
	resolveOcrProviderStatus,
} from './ocr-status.ts'

describe('ocr-status', () => {
	it('treats PAGE_LIMIT_EXCEEDED as a runtime error while keeping provider ready', () => {
		const snapshot = resolveOcrProviderStatus({
			providerType: 'google',
			failures: [
				{
					message:
						'Google Document AI failed (400): PAGE_LIMIT_EXCEEDED — Document pages exceed the limit: 15 got 22',
					occurredAt: '2026-07-30T12:00:00.000Z',
					source: 'report',
				},
			],
			successes: [],
		})

		expect(snapshot.configurationStatus).toBe('ready')
		expect(snapshot.configurationStatusLabel).toBe('Ready')
		expect(snapshot.latestProcessingError).toContain('22 pages')
		expect(snapshot.latestProcessingError).toContain('smaller batches')
		expect(
			isOcrConfigurationError(snapshot.latestProcessingErrorRaw ?? ''),
		).toBe(false)
	})

	it('shows not configured only for missing provider setup errors', () => {
		const snapshot = resolveOcrProviderStatus({
			providerType: 'google',
			failures: [
				{
					message:
						'OCR unavailable. Deploy the document-ocr edge function and configure GOOGLE_DOCUMENT_AI_* secrets in Supabase.',
					occurredAt: '2026-07-30T12:00:00.000Z',
					source: 'report',
				},
			],
			successes: [],
		})

		expect(snapshot.configurationStatus).toBe('not_configured')
		expect(snapshot.latestProcessingError).toBeNull()
	})

	it('clears runtime error state after a successful OCR run', () => {
		const snapshot = resolveOcrProviderStatus({
			providerType: 'google',
			failures: [
				{
					message: 'Google Document AI failed (400): PAGE_LIMIT_EXCEEDED',
					occurredAt: '2026-07-30T11:00:00.000Z',
					source: 'report',
				},
			],
			successes: [
				{
					message: 'completed',
					occurredAt: '2026-07-30T12:00:00.000Z',
					source: 'report',
				},
			],
		})

		expect(snapshot.configurationStatus).toBe('ready')
		expect(snapshot.lastSuccessfulAt).toBe('2026-07-30T12:00:00.000Z')
		expect(snapshot.latestProcessingError).toBeNull()
	})

	it('formats page limit errors for end users', () => {
		expect(
			formatOcrRuntimeError(
				'Google Document AI failed (400): PAGE_LIMIT_EXCEEDED limit: 15 got 22',
			),
		).toContain('22 pages')
		expect(
			formatOcrRuntimeError(
				'Google Document AI failed (400): PAGE_LIMIT_EXCEEDED limit: 15 got 22',
			),
		).toContain('smaller batches')
	})
})
