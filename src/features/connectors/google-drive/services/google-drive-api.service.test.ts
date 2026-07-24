import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadDriveFile } from '@/features/connectors/google-drive/services/google-drive-api.service'

const mockInvoke = vi.fn()

vi.mock('@/lib/supabase', () => ({
	supabase: {
		functions: {
			invoke: (...args: unknown[]) => mockInvoke(...args),
		},
	},
}))

describe('downloadDriveFile', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('throws with edge function error when success is false', async () => {
		mockInvoke.mockResolvedValue({
			data: {
				success: false,
				error: 'Google Drive download failed (401): UNAUTHENTICATED',
			},
			error: null,
		})

		await expect(
			downloadDriveFile({
				userId: 'user-1',
				externalFileId: 'file-1',
				fileName: 'lab.pdf',
			}),
		).rejects.toThrow('Google Drive download failed (401): UNAUTHENTICATED')
	})

	it('throws when storage path is missing', async () => {
		mockInvoke.mockResolvedValue({
			data: {
				success: true,
				fileSize: 0,
			},
			error: null,
		})

		await expect(
			downloadDriveFile({
				userId: 'user-1',
				externalFileId: 'file-1',
				fileName: 'lab.pdf',
			}),
		).rejects.toThrow('Download succeeded but no storage path returned')
	})

	it('returns download payload when successful', async () => {
		mockInvoke.mockResolvedValue({
			data: {
				success: true,
				storagePath: 'user-1/123-lab.pdf',
				fileSize: 2048,
				sha256Checksum: 'abc123',
			},
			error: null,
		})

		await expect(
			downloadDriveFile({
				userId: 'user-1',
				externalFileId: 'file-1',
				fileName: 'lab.pdf',
			}),
		).resolves.toEqual({
			success: true,
			storagePath: 'user-1/123-lab.pdf',
			fileSize: 2048,
			sha256Checksum: 'abc123',
		})
	})
})
