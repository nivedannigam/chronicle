import { describe, expect, it } from 'vitest'
import {
	formatStorageMimeRejectionError,
	formatUnsupportedHealthReportMimeError,
	inferHealthReportMimeType,
	isImageMimeType,
	isPdfMimeType,
	isSupportedHealthReportMimeType,
	normalizeHealthReportMimeType,
	resolveHealthReportMimeType,
} from './supported-mime-types.ts'

describe('supported health report mime types', () => {
	it('normalizes image/jpg to image/jpeg', () => {
		expect(normalizeHealthReportMimeType('image/jpg')).toBe('image/jpeg')
	})

	it('accepts common medical document formats', () => {
		for (const mime of [
			'application/pdf',
			'image/jpeg',
			'image/png',
			'image/heic',
			'image/heif',
			'image/tiff',
			'image/webp',
		]) {
			expect(isSupportedHealthReportMimeType(mime)).toBe(true)
		}
	})

	it('infers mime type from file extension', () => {
		expect(inferHealthReportMimeType('report.JPG')).toBe('image/jpeg')
		expect(inferHealthReportMimeType('scan.heic')).toBe('image/heic')
		expect(inferHealthReportMimeType('lab.tiff')).toBe('image/tiff')
	})

	it('prefers explicit mime type when supported', () => {
		expect(
			resolveHealthReportMimeType({
				fileName: 'report.bin',
				mimeType: 'image/png',
			}),
		).toBe('image/png')
	})

	it('classifies pdf vs image for OCR dispatch', () => {
		expect(isPdfMimeType('application/pdf')).toBe(true)
		expect(isImageMimeType('image/jpeg')).toBe(true)
		expect(isPdfMimeType('image/jpeg')).toBe(false)
	})

	it('formats user-facing unsupported type errors', () => {
		expect(formatUnsupportedHealthReportMimeError('video/mp4')).toBe(
			'Unsupported file type. Received: video/mp4. Supported: PDF, JPG, PNG, HEIC, TIFF.',
		)
	})

	it('rewrites storage bucket mime rejections', () => {
		expect(
			formatStorageMimeRejectionError(
				'mime type image/jpeg is not supported',
				'image/jpeg',
			),
		).toBe(
			'Unsupported file type. Received: image/jpeg. Supported: PDF, JPG, PNG, HEIC, TIFF.',
		)
	})
})
