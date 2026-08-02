import { describe, expect, it } from 'vitest'
import {
	isPhotoImportFile,
	PHOTO_IMPORT_SKIP_MESSAGE,
} from '@/features/health-import/constants/import-file-rules'

describe('import-file-rules', () => {
	it('detects photo files by mime and extension', () => {
		expect(isPhotoImportFile('IMG_8104.jpg', 'image/jpeg')).toBe(true)
		expect(isPhotoImportFile('scan.heic', null)).toBe(true)
		expect(isPhotoImportFile('lab-report.pdf', 'application/pdf')).toBe(false)
	})

	it('uses a skip message for photos', () => {
		expect(PHOTO_IMPORT_SKIP_MESSAGE.toLowerCase()).toContain('photo')
	})
})
