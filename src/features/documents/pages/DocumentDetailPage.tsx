import { useNavigate, useParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { getDocument } from '@/features/documents/services/document.service'
import { getDocumentSignedUrl } from '@/features/documents/services/document-upload.service'
import {
	getDocumentCategory,
	getDocumentSubCategory,
} from '@/features/documents/types/document-categories'
import { queryKeys } from '@/lib/query-keys'
import { FigmaCard, FigmaSectionLabel } from '@/ui/figma/components/primitives'
import {
	HealthActionChip,
	HealthMetaGrid,
	HealthScreen,
	HealthSubpageHeader,
} from '@/ui/figma/health/health-ui'

function formatDate(value: string | null): string {
	if (!value) {
		return '—'
	}

	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

export function DocumentDetailPage() {
	const { documentId = '' } = useParams()
	const navigate = useNavigate()

	const documentQuery = useQuery({
		queryKey: queryKeys.documents.detail(documentId),
		queryFn: () => getDocument(documentId),
		enabled: Boolean(documentId),
	})

	const document = documentQuery.data
	const storagePath = document?.storage_path

	const signedUrlQuery = useQuery({
		queryKey: ['document-signed-url', storagePath],
		queryFn: () => getDocumentSignedUrl(storagePath!),
		enabled: Boolean(storagePath),
		staleTime: 55 * 60 * 1000,
	})

	const signedUrl = signedUrlQuery.data ?? null

	if (documentQuery.isLoading) {
		return (
			<HealthScreen>
				<ListSkeleton rows={4} />
			</HealthScreen>
		)
	}

	if (!document) {
		return (
			<HealthScreen>
				<FigmaCard
					style={{
						padding: '24px 16px',
						fontSize: 14,
						color: C.textMuted,
						textAlign: 'center',
					}}
				>
					Document not found.
				</FigmaCard>
			</HealthScreen>
		)
	}

	const category = getDocumentCategory(document.category_id)
	const sub = document.sub_category_id
		? getDocumentSubCategory(document.category_id, document.sub_category_id)
		: undefined

	return (
		<HealthScreen padding="0 18px 20px">
			<HealthSubpageHeader
				backLabel="Documents"
				onBack={() => navigate(ROUTES.documents)}
				title={document.title}
				subtitle={sub?.label ?? category?.label ?? document.category_id}
			/>

			<HealthMetaGrid
				rows={[
					{ label: 'Document number', value: document.document_number ?? '—' },
					{ label: 'Issuer', value: document.issuer ?? '—' },
					{ label: 'Issue date', value: formatDate(document.issue_date) },
					{ label: 'Expiry date', value: formatDate(document.expiry_date) },
					{ label: 'Source', value: document.source ?? '—' },
					{ label: 'File', value: document.file_name ?? '—' },
				]}
			/>

			{signedUrl ? (
				<div style={{ marginBottom: 20 }}>
					<HealthActionChip
						icon={ExternalLink}
						label="Open secure copy"
						onClick={() =>
							window.open(signedUrl, '_blank', 'noopener,noreferrer')
						}
					/>
				</div>
			) : null}

			{document.notes ? (
				<section>
					<FigmaSectionLabel>Notes</FigmaSectionLabel>
					<FigmaCard
						style={{
							padding: '14px 16px',
							fontSize: 14,
							color: C.textSec,
							lineHeight: 1.65,
						}}
					>
						{document.notes}
					</FigmaCard>
				</section>
			) : null}
		</HealthScreen>
	)
}
