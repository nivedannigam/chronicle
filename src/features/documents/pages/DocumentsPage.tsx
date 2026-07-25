import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Upload } from 'lucide-react'
import { C } from '@/constants/colors'
import { documentPath } from '@/constants/routes'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useUploadDocument } from '@/features/documents/hooks/useUploadDocument'
import {
	getDocumentCategory,
	getDocumentSubCategory,
} from '@/features/documents/types/document-categories'

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
	const { data: documents = [], isLoading } = useMemberDocuments()
	const uploadDocument = useUploadDocument()

	return (
		<div>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 16,
				}}
			>
				<div style={{ fontSize: 14, color: C.textSec }}>
					{documents.length} document{documents.length === 1 ? '' : 's'} in your
					library
				</div>
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					disabled={uploadDocument.isPending}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						background: C.accent,
						color: C.white,
						border: 'none',
						borderRadius: 12,
						padding: '8px 12px',
						fontSize: 13,
						fontWeight: 700,
						cursor: 'pointer',
						fontFamily: 'inherit',
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

			{uploadDocument.isError ? (
				<div style={{ color: C.orange, fontSize: 13, marginBottom: 12 }}>
					{uploadDocument.error instanceof Error
						? uploadDocument.error.message
						: 'Upload failed.'}
				</div>
			) : null}

			{isLoading ? (
				<div style={{ color: C.textMuted, fontSize: 14 }}>
					Loading documents…
				</div>
			) : documents.length === 0 ? (
				<div
					style={{
						padding: '24px 16px',
						borderRadius: 16,
						border: `1px dashed ${C.border}`,
						color: C.textMuted,
						fontSize: 14,
						lineHeight: 1.5,
					}}
				>
					Upload passports, insurance policies, property papers, and other
					important documents. Chronicle will extract metadata and make them
					searchable in Ask.
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{documents.map((document) => {
						const category = getDocumentCategory(document.category_id)
						const sub = document.sub_category_id
							? getDocumentSubCategory(
									document.category_id,
									document.sub_category_id,
								)
							: undefined

						return (
							<Link
								key={document.id}
								to={documentPath(document.id)}
								style={{
									display: 'flex',
									gap: 12,
									padding: '14px 16px',
									borderRadius: 16,
									background: C.card,
									border: `1px solid ${C.border}`,
									textDecoration: 'none',
									color: C.text,
								}}
							>
								<div
									style={{
										width: 40,
										height: 40,
										borderRadius: 12,
										background: C.accentBlueDim,
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
									<div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>
										{document.expiry_date
											? `Expires ${formatDate(document.expiry_date)}`
											: `Added ${formatDate(document.uploaded_at)}`}
									</div>
								</div>
							</Link>
						)
					})}
				</div>
			)}
		</div>
	)
}
