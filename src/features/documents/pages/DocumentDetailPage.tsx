import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ROUTES } from '@/constants/routes'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { getDocument } from '@/features/documents/services/document.service'
import {
	FigmaDocumentDetailScreen,
	FigmaDocumentDetailSkeleton,
} from '@/ui/figma/screens/FigmaDocumentDetailScreen'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'
import { ProfilePageShell } from '@/ui/figma/profile/profile-ui'
import { queryKeys } from '@/lib/query-keys'

export function DocumentDetailPage() {
	const { documentId = '' } = useParams()
	const navigate = useNavigate()

	const documentQuery = useQuery({
		queryKey: queryKeys.documents.detail(documentId),
		queryFn: () => getDocument(documentId),
		enabled: Boolean(documentId),
	})

	if (documentQuery.isLoading) {
		return <FigmaDocumentDetailSkeleton />
	}

	if (documentQuery.isError) {
		return (
			<ProfilePageShell
				title="Document"
				backLabel="Documents"
				onBack={() => navigate(ROUTES.documents)}
			>
				<InlineErrorBanner
					message="Could not load this document."
					onRetry={() => void documentQuery.refetch()}
				/>
			</ProfilePageShell>
		)
	}

	if (!documentQuery.data) {
		return (
			<ProfilePageShell
				title="Document"
				backLabel="Documents"
				onBack={() => navigate(ROUTES.documents)}
			>
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 18,
						padding: '24px 18px',
						textAlign: 'center',
						color: FC.mid,
						fontSize: 14,
					}}
				>
					Document not found.
				</div>
			</ProfilePageShell>
		)
	}

	return <FigmaDocumentDetailScreen document={documentQuery.data} />
}
