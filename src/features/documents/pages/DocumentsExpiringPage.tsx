import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { documentPath } from '@/constants/routes'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { documentsExpiringWithin } from '@/features/documents/services/document.service'
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
			<HealthPageIntro>
				Documents expiring within the next year — renew before they lapse.
			</HealthPageIntro>

			{isError ? (
				<InlineErrorBanner
					message="Could not load documents."
					onRetry={() => void refetch()}
				/>
			) : null}

			{isLoading ? (
				<ListSkeleton rows={3} height={56} />
			) : expiring.length === 0 ? (
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
					<div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
					No upcoming expiries found in your document library.
				</FigmaCard>
			) : (
				<div style={{ display: 'grid', gap: 10 }}>
					{expiring.map((document) => (
						<FigmaCard
							key={document.id}
							style={{
								background: `${C.orange}10`,
								border: `1px solid ${C.orange}33`,
							}}
						>
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
								<div style={{ flex: 1, minWidth: 0 }}>
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
									<div style={{ fontSize: 12, color: C.orange }}>
										Expires {formatDate(document.expiry_date)}
									</div>
								</div>
								<ChevronRight size={16} color={C.textMuted} />
							</Link>
						</FigmaCard>
					))}
				</div>
			)}
		</div>
	)
}
