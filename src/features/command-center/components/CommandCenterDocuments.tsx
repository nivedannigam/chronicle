import { useNavigate } from 'react-router-dom'
import { ChevronRight, FileText } from 'lucide-react'
import { C } from '@/constants/colors'
import { COMMAND_CENTER_COPY } from '@/constants/product-copy'
import { ROUTES, documentPath } from '@/constants/routes'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'

interface CommandCenterDocumentsProps {
	documentCount: number
	expiringDocuments: ChronicleDocument[]
	isLoading?: boolean
}

function formatExpiry(date: string | null): string {
	if (!date) {
		return '—'
	}

	return new Date(date).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

export function CommandCenterDocuments({
	documentCount,
	expiringDocuments,
	isLoading = false,
}: CommandCenterDocumentsProps) {
	const navigate = useNavigate()

	if (isLoading) {
		return (
			<section style={{ marginBottom: 24 }}>
				<HomeSectionLabel>
					{COMMAND_CENTER_COPY.documentsLabel}
				</HomeSectionLabel>
				<div
					style={{
						height: 96,
						borderRadius: 16,
						background: C.card,
						border: `1px solid ${C.border}`,
						opacity: 0.55,
					}}
				/>
			</section>
		)
	}

	if (documentCount === 0) {
		return (
			<section style={{ marginBottom: 24 }}>
				<HomeSectionLabel>
					{COMMAND_CENTER_COPY.documentsLabel}
				</HomeSectionLabel>
				<button
					type="button"
					onClick={() => navigate(ROUTES.documents)}
					style={{
						width: '100%',
						padding: '16px',
						borderRadius: 16,
						border: `1px dashed ${C.border}`,
						background: C.card,
						cursor: 'pointer',
						fontFamily: 'inherit',
						textAlign: 'left',
					}}
				>
					<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
						No documents yet
					</div>
					<div style={{ fontSize: 12, color: C.textMuted }}>
						Upload passports, insurance policies, and property papers.
					</div>
				</button>
			</section>
		)
	}

	return (
		<section style={{ marginBottom: 24 }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 12,
				}}
			>
				<HomeSectionLabel>
					{COMMAND_CENTER_COPY.documentsLabel}
				</HomeSectionLabel>
				<button
					type="button"
					onClick={() => navigate(ROUTES.documents)}
					style={{
						background: 'none',
						border: 'none',
						padding: 0,
						fontSize: 12,
						fontWeight: 600,
						color: C.accent,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					View all
				</button>
			</div>

			<div
				style={{
					padding: '14px 16px',
					borderRadius: 16,
					background: C.card,
					border: `1px solid ${C.border}`,
					marginBottom: expiringDocuments.length > 0 ? 8 : 0,
				}}
			>
				<div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
					{documentCount}
				</div>
				<div style={{ fontSize: 12, color: C.textMuted }}>
					document{documentCount === 1 ? '' : 's'} in your library
				</div>
			</div>

			{expiringDocuments.length > 0 ? (
				<div
					style={{
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 16,
						overflow: 'hidden',
					}}
				>
					{expiringDocuments.map((document, index) => (
						<button
							key={document.id}
							type="button"
							onClick={() => navigate(documentPath(document.id))}
							style={{
								width: '100%',
								display: 'flex',
								alignItems: 'center',
								gap: 10,
								padding: '12px 14px',
								background: 'transparent',
								border: 'none',
								borderBottom:
									index === expiringDocuments.length - 1
										? 'none'
										: `1px solid ${C.border}`,
								cursor: 'pointer',
								textAlign: 'left',
								fontFamily: 'inherit',
							}}
						>
							<FileText size={16} color={C.orange} />
							<div style={{ flex: 1, minWidth: 0 }}>
								<div style={{ fontSize: 13, fontWeight: 600 }}>
									{document.title}
								</div>
								<div style={{ fontSize: 11, color: C.textMuted }}>
									Expires {formatExpiry(document.expiry_date)}
								</div>
							</div>
							<ChevronRight size={14} color={C.textMuted} />
						</button>
					))}
				</div>
			) : null}
		</section>
	)
}
