import { describe, expect, it } from 'vitest'
import {
	buildDocumentAiProcessRequest,
	describeDocumentAiRequestForLog,
} from './document-ai-client.ts'

describe('buildDocumentAiProcessRequest', () => {
	it('enables imageless mode with camelCase REST field', () => {
		const payload = buildDocumentAiProcessRequest({
			pdfBytes: new Uint8Array([1, 2, 3]),
			mimeType: 'application/pdf',
			imagelessModeEnabled: true,
		})

		expect(payload.imagelessMode).toBe(true)
		expect(payload.rawDocument.mimeType).toBe('application/pdf')
		expect(typeof payload.rawDocument.content).toBe('string')
		expect(payload.rawDocument.content.length).toBeGreaterThan(0)
	})

	it('logs a sanitized payload without raw base64 content', () => {
		const payload = buildDocumentAiProcessRequest({
			pdfBytes: new Uint8Array([1, 2, 3]),
			mimeType: 'application/pdf',
			imagelessModeEnabled: true,
		})

		expect(describeDocumentAiRequestForLog(payload, 3)).toEqual({
			rawDocument: {
				mimeType: 'application/pdf',
				contentByteLength: 3,
				contentBase64Length: payload.rawDocument.content.length,
			},
			imagelessMode: true,
			pageSelectorCount: null,
		})
	})

	it('disables imageless mode only when explicitly configured off', () => {
		const payload = buildDocumentAiProcessRequest({
			pdfBytes: new Uint8Array([1]),
			mimeType: 'application/pdf',
			imagelessModeEnabled: false,
		})

		expect(payload.imagelessMode).toBe(false)
	})
})

describe('22-page imageless request shape', () => {
	it('matches Google processors.process REST contract', () => {
		const payload = buildDocumentAiProcessRequest({
			pdfBytes: new Uint8Array(1024),
			mimeType: 'application/pdf',
			imagelessModeEnabled: true,
		})

		expect(JSON.parse(JSON.stringify(payload))).toEqual({
			rawDocument: {
				content: payload.rawDocument.content,
				mimeType: 'application/pdf',
			},
			imagelessMode: true,
		})
	})
})
