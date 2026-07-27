import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, FileText, Upload } from 'lucide-react'
import { C } from '@/constants/colors'
import { documentPath } from '@/constants/routes'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useUploadDocument } from '@/features/documents/hooks/useUploadDocument'
import {
	getDocumentCategory,
	getDocumentSubCategory,
} from '@/features/documents/types/document-categories'
import { FigmaCard } from '@/ui/figma/components/primitives'
import { HealthPageIntro } from '@/ui/figma/health/health-ui'

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

export function DocumentsPage() {
	const fileInputRef = useRef<HTMLInputElement>(null)
	const {
		data: documents = [],
		isLoading,
		isError,
		refetch,
	} = useMemberDocuments()
	const uploadDocument = useUploadDocument()

	return (
		<div>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 12,
					marginBottom: 12,
				}}
			>
				<div style={{ fontSize: 14, fontWeight: 600, color: C.textSec }}>
					{documents.length} document{documents.length === 1 ? '' : 's'}
				</div>
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					disabled={uploadDocument.isPending}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						background: C.accentBlue,
						color: C.white,
						border: 'none',
						borderRadius: 100,
						padding: '10px 14px',
						fontSize: 13,
						fontWeight: 700,
						cursor: uploadDocument.isPending ? 'not-allowed' : 'pointer',
						fontFamily: 'inherit',
						flexShrink: 0,
						opacity: uploadDocument.isPending ? 0.65 : 1,
						minHeight: 36,
					}}
				>
					<Upload size={16} />
					Upload
				</button>
				<input
					ref={fileInputRef}
					type="file"
					accept="application/pdf,image/jpeg,image/png,image/webp"
					style={{ display: 'none' }}
					onChange={(event) => {
						const file = event.target.files?.[0]

						if (file) {
							void uploadDocument.mutateAsync(file)
						}

						event.target.value = ''
					}}
				/>
			</div>

			<HealthPageIntro>
				Passports, insurance policies, property papers, and other important
				documents — searchable in Ask.
			</HealthPageIntro>

			{uploadDocument.isError ? (
				<div style={{ color: C.orange, fontSize: 13, marginBottom: 12 }}>
					{uploadDocument.error instanceof Error
						? uploadDocument.error.message
						: 'Upload failed.'}
				</div>
			) : null}

			{isError ? (
				<InlineErrorBanner
					message="Could not load documents."
					onRetry={() => void refetch()}
				/>
			) : null}

			{isLoading ? (
				<ListSkeleton rows={4} />
			) : documents.length === 0 ? (
				<FigmaCard
					style={{
						border: `1px dashed ${C.border}`,
						padding: '24px 16px',
						fontSize: 14,
						color: C.textMuted,
						lineHeight: 1.55,
						textAlign: 'center',
					}}
				>
					<div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
					Upload passports, insurance policies, property papers, and other
					important documents. Chronicle will extract metadata and make them
					searchable in Ask.
				</FigmaCard>
			) : (
				<div style={{ display: 'grid', gap: 10 }}>
					{documents.map((document) => {
						const category = getDocumentCategory(document.category_id)
						const sub = document.sub_category_id
							? getDocumentSubCategory(
									document.category_id,
									document.sub_category_id,
								)
							: undefined

						return (
							<FigmaCard key={document.id}>
								<Link
									to={documentPath(document.id)}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 12,
										padding: '14px 16px',
										textDecoration: 'none',
										color: C.text,
									}}
								>
									<div
										style={{
											width: 40,
											height: 40,
											borderRadius: 12,
											background: `${C.accentBlue}18`,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											flexShrink: 0,
										}}
									>
										<FileText size={18} color={C.accentBlue} />
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												fontSize: 15,
												fontWeight: 700,
												marginBottom: 4,
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
										>
											{document.title}
										</div>
										<div style={{ fontSize: 12, color: C.textMuted }}>
											{sub?.label ?? category?.label ?? document.category_id}
											{document.document_number
												? ` · ${document.document_number}`
												: ''}
										</div>
										<div
											style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}
										>
											{document.expiry_date
												? `Expires ${formatDate(document.expiry_date)}`
												: `Added ${formatDate(document.uploaded_at)}`}
										</div>
									</div>
									<ChevronRight size={16} color={C.textMuted} />
								</Link>
							</FigmaCard>
						)
					})}
				</div>
			)}
		</div>
	)
}
