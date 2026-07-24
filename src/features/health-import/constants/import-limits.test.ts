import { describe, expect, it } from 'vitest'
import {
	formatFileTooLargeError,
	isFileTooLargeError,
} from '@/features/health-import/constants/import-limits'

describe('import file size helpers', () => {
	it('formats a readable oversize error', () => {
		const message = formatFileTooLargeError('Lab Report.pdf', 12 * 1024 * 1024)

		expect(message).toContain('Lab Report.pdf')
		expect(message).toContain('50 MB')
	})

	it('detects permanent storage limit failures', () => {
		expect(
			isFileTooLargeError(
				'File exceeds size limit: "x.pdf" is 12.0 MB (max 50 MB)',
			),
		).toBe(true)
		expect(
			isFileTooLargeError(
				'Storage upload failed: exceeded the maximum allowed size',
			),
		).toBe(true)
		expect(isFileTooLargeError('Google Drive download failed')).toBe(false)
	})
})
