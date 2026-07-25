import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { uploadDocument } from '@/features/documents/services/document-upload.service'
import { queryKeys } from '@/lib/query-keys'

export function useUploadDocument() {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const { selectedMemberId } = useFamilyContext()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (file: File) =>
			uploadDocument({
				userId,
				file,
				familyMemberId: selectedMemberId,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.documents.list(userId),
			})
		},
	})
}
