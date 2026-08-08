import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { documentPath } from '@/constants/routes'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { useDocumentsContext } from '@/features/documents/context/DocumentsContext'
import { FigmaCard } from '@/ui/figma/components/primitives'
import { HealthPageIntro } from '@/ui/figma/health/health-ui'

export function DocumentsExpiringPage() {
	const { hub, isLoading, isError, refetch } = useDocumentsContext()

	const expiring = useMemo(
		() =>
			hub.allDocuments.filter(
				(document) => document.isExpiringSoon || document.isExpired,
			),
		[hub.allDocuments],
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
				<ListSkeleton rows={4} />
			) : expiring.length === 0 ? (
				<p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
					No expiring documents right now.
				</p>
			) : (
				expiring.map((document) => (
					<Link
						key={document.id}
						to={documentPath(document.id)}
						style={{ textDecoration: 'none', color: 'inherit' }}
					>
						<FigmaCard
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								marginBottom: 10,
								padding: '14px 16px',
							}}
						>
							<div>
								<div style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>
									{document.title}
								</div>
								<div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
									{document.categoryLabel}
									{document.expiresLabel
										? ` · Expires ${document.expiresLabel}`
										: document.isExpired
											? ' · Expired'
											: ''}
								</div>
							</div>
							<ChevronRight size={18} color={C.textMuted} />
						</FigmaCard>
					</Link>
				))
			)}
		</div>
	)
}
