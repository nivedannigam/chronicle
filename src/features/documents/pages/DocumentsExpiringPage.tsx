import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { C } from '@/constants/colors'
import { documentPath } from '@/constants/routes'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { documentsExpiringWithin } from '@/features/documents/services/document.service'

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

export function DocumentsExpiringPage() {
	const {
		data: documents = [],
		isLoading,
		isError,
		refetch,
	} = useMemberDocuments()
	const expiring = useMemo(
		() => documentsExpiringWithin(documents, 365),
		[documents],
	)

	return (
		<div>
			<div style={{ fontSize: 14, color: C.textSec, marginBottom: 16 }}>
				Documents expiring within the next year
			</div>

			{isError ? (
				<InlineErrorBanner
					message="Could not load documents."
					onRetry={() => void refetch()}
				/>
			) : null}

			{isLoading ? (
				<ListSkeleton rows={3} height={56} />
			) : expiring.length === 0 ? (
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
					No upcoming expiries found in your document library.
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{expiring.map((document) => (
						<Link
							key={document.id}
							to={documentPath(document.id)}
							style={{
								padding: '12px 14px',
								borderRadius: 14,
								background: `${C.orange}12`,
								border: `1px solid ${C.orange}44`,
								textDecoration: 'none',
								color: C.text,
							}}
						>
							<div
								style={{
									fontWeight: 700,
									marginBottom: 4,
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
								}}
							>
								{document.title}
							</div>
							<div style={{ fontSize: 12, color: C.textSec }}>
								Expires {formatDate(document.expiry_date)}
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	)
}
