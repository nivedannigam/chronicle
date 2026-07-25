import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { getDocument } from '@/features/documents/services/document.service'
import { getDocumentSignedUrl } from '@/features/documents/services/document-upload.service'
import {
	getDocumentCategory,
	getDocumentSubCategory,
} from '@/features/documents/types/document-categories'
import { queryKeys } from '@/lib/query-keys'

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
		return <div style={{ color: C.textMuted }}>Loading document…</div>
	}

	if (!document) {
		return <div style={{ color: C.textMuted }}>Document not found.</div>
	}

	const category = getDocumentCategory(document.category_id)
	const sub = document.sub_category_id
		? getDocumentSubCategory(document.category_id, document.sub_category_id)
		: undefined

	return (
		<div style={{ padding: '18px 18px 24px', color: C.text }}>
			<Link
				to={ROUTES.documents}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 6,
					color: C.textSec,
					textDecoration: 'none',
					marginBottom: 18,
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				Documents
			</Link>

			<div
				style={{
					fontSize: 28,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				{document.title}
			</div>
			<div style={{ fontSize: 14, color: C.textMuted, marginBottom: 20 }}>
				{sub?.label ?? category?.label ?? document.category_id}
			</div>

			<div
				style={{
					display: 'grid',
					gap: 10,
					marginBottom: 20,
					padding: '14px 16px',
					borderRadius: 16,
					background: C.card,
					border: `1px solid ${C.border}`,
				}}
			>
				<DetailRow label="Document number" value={document.document_number} />
				<DetailRow label="Issuer" value={document.issuer} />
				<DetailRow label="Issue date" value={formatDate(document.issue_date)} />
				<DetailRow
					label="Expiry date"
					value={formatDate(document.expiry_date)}
				/>
				<DetailRow label="Source" value={document.source} />
				<DetailRow label="File" value={document.file_name} />
			</div>

			{signedUrl ? (
				<a
					href={signedUrl}
					target="_blank"
					rel="noreferrer"
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						color: C.accentBlue,
						fontWeight: 700,
						fontSize: 14,
						textDecoration: 'none',
					}}
				>
					Open secure copy
					<ExternalLink size={16} />
				</a>
			) : null}

			{document.notes ? (
				<div style={{ marginTop: 20, fontSize: 14, color: C.textSec }}>
					{document.notes}
				</div>
			) : null}
		</div>
	)
}

function DetailRow({
	label,
	value,
}: {
	label: string
	value: string | null | undefined
}) {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				gap: 12,
				fontSize: 13,
			}}
		>
			<span style={{ color: C.textMuted }}>{label}</span>
			<span style={{ color: C.textSec, textAlign: 'right' }}>
				{value ?? '—'}
			</span>
		</div>
	)
}
