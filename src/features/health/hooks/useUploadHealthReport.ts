import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadedHealthReportsQueryKey } from '@/features/health/hooks/useUploadedHealthReports'
import { uploadHealthReport } from '@/features/health/services/health-upload.service'

export function useUploadHealthReport(userId: string | undefined) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (file: File) => {
			if (!userId) {
				throw new Error('You must be signed in to upload a report.')
			}

			return uploadHealthReport(userId, file)
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: uploadedHealthReportsQueryKey(userId),
			})
		},
	})
}
