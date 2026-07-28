import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, FileText, Search } from 'lucide-react'
import { documentPath, ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { getDocumentSubCategory } from '@/features/documents/types/document-categories'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { FC, FigmaLbl, figmaCardStyle } from '@/ui/figma/v2/atoms'

const CATEGORY_META = [
	{ label: 'Medical', emoji: '🏥', color: FC.green, categoryId: 'medical' },
	{ label: 'Finance', emoji: '💰', color: FC.amber, categoryId: 'financial' },
	{ label: 'Travel', emoji: '✈️', color: FC.blue, categoryId: 'other' },
	{ label: 'Legal', emoji: '⚖️', color: FC.purple, categoryId: 'property' },
	{ label: 'Insurance', emoji: '🛡️', color: FC.teal, categoryId: 'insurance' },
	{ label: 'Education', emoji: '📚', color: FC.pink, categoryId: 'education' },
] as const

function categoryColor(categoryId: string): string {
	return (
		CATEGORY_META.find((category) => category.categoryId === categoryId)
			?.color ?? FC.blue
	)
}

function formatDocumentSubtitle(document: ChronicleDocument): string {
	if (document.expiry_date) {
		const expiry = new Date(document.expiry_date)
		if (!Number.isNaN(expiry.getTime())) {
			return `Expires ${expiry.toLocaleDateString('en-US', {
				month: 'short',
				year: 'numeric',
			})}`
		}
	}

	if (document.issue_date) {
		const issued = new Date(document.issue_date)
		if (!Number.isNaN(issued.getTime())) {
			return `Added ${issued.toLocaleDateString('en-US', {
				month: 'short',
				year: 'numeric',
			})}`
		}
	}

	const subCategory = document.sub_category_id
		? getDocumentSubCategory(document.category_id, document.sub_category_id)
		: undefined

	return subCategory?.label ?? 'Saved document'
}

function isExpiringSoon(document: ChronicleDocument): boolean {
	if (!document.expiry_date) return false
	const expiry = new Date(document.expiry_date)
	if (Number.isNaN(expiry.getTime())) return false
	const months = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
	return months <= 12 && months >= 0
}

function documentFileTypeBadge(mimeType: string): string {
	if (mimeType.toLowerCase().includes('pdf')) return 'PDF'
	if (mimeType.toLowerCase().startsWith('image/')) return 'IMG'
	return 'DOC'
}

function getExpiryProgress(document: ChronicleDocument): {
	percent: number
	label: string
	monthsRemaining: number
} | null {
	if (!document.expiry_date) return null

	const expiry = new Date(document.expiry_date)
	if (Number.isNaN(expiry.getTime())) return null

	const msRemaining = expiry.getTime() - Date.now()
	if (msRemaining < 0) return null

	const monthsRemaining = msRemaining / (1000 * 60 * 60 * 24 * 30)

	let totalMonths = 12
	if (document.issue_date) {
		const issue = new Date(document.issue_date)
		if (!Number.isNaN(issue.getTime())) {
			const totalMs = expiry.getTime() - issue.getTime()
			totalMonths = Math.max(1, totalMs / (1000 * 60 * 60 * 24 * 30))
		}
	}

	const percent = Math.min(
		100,
		Math.max(0, (monthsRemaining / totalMonths) * 100),
	)

	return {
		percent,
		label: `${Math.round(monthsRemaining)} of ${Math.round(totalMonths)} months`,
		monthsRemaining,
	}
}

function formatExpiryHeadline(document: ChronicleDocument): string {
	const progress = getExpiryProgress(document)
	if (!progress) return `${document.title} expires soon`

	const roundedMonths = Math.max(1, Math.round(progress.monthsRemaining))
	return `${document.title} expires in ${roundedMonths} month${roundedMonths === 1 ? '' : 's'}`
}

export function FigmaDocumentsScreen() {
	const navigate = useNavigate()
	const { data: documents = [], isLoading } = useMemberDocuments()

	const categories = useMemo(
		() =>
			CATEGORY_META.map((category) => ({
				...category,
				count: documents.filter(
					(document) => document.category_id === category.categoryId,
				).length,
			})),
		[documents],
	)

	const recent = useMemo(
		() =>
			[...documents]
				.sort(
					(a, b) =>
						new Date(b.updated_at ?? b.created_at).getTime() -
						new Date(a.updated_at ?? a.created_at).getTime(),
				)
				.slice(0, 4)
				.map((document) => ({
					id: document.id,
					title: document.title,
					subtitle: formatDocumentSubtitle(document),
					color: categoryColor(document.category_id),
					warn: isExpiringSoon(document),
					fileType: documentFileTypeBadge(document.mime_type),
				})),
		[documents],
	)

	const nextExpiry = useMemo(() => {
		return [...documents]
			.filter((document) => document.expiry_date && isExpiringSoon(document))
			.sort(
				(a, b) =>
					new Date(a.expiry_date!).getTime() -
					new Date(b.expiry_date!).getTime(),
			)[0]
	}, [documents])

	const expiryProgress = nextExpiry ? getExpiryProgress(nextExpiry) : null

	if (isLoading) {
		return (
			<div style={{ padding: '0 22px' }}>
				<ListSkeleton rows={6} />
			</div>
		)
	}

	return (
		<div style={{ padding: '0 22px 24px' }}>
			<div style={{ padding: '4px 0 18px' }}>
				<button
					type="button"
					onClick={() => navigate(ROUTES.search)}
					style={{
						width: '100%',
						background: FC.surface,
						border: `1px solid ${FC.line}`,
						borderRadius: 18,
						padding: '13px 16px',
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					<Search size={17} color="rgba(255,255,255,0.2)" />
					<span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 15 }}>
						Search all documents…
					</span>
				</button>
			</div>

			{nextExpiry && expiryProgress ? (
				<div
					style={{
						background: 'rgba(245,158,11,0.07)',
						border: '1px solid rgba(245,158,11,0.2)',
						borderRadius: 20,
						padding: '15px 18px 14px',
						marginBottom: 24,
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 13,
							marginBottom: 12,
						}}
					>
						<span style={{ fontSize: 20, flexShrink: 0 }}>🛂</span>
						<div style={{ flex: 1 }}>
							<p
								style={{
									color: FC.fg,
									fontSize: 14,
									fontWeight: 600,
									marginBottom: 2,
									marginTop: 0,
								}}
							>
								{formatExpiryHeadline(nextExpiry)}
							</p>
							<p
								style={{
									color: 'rgba(255,255,255,0.38)',
									fontSize: 12,
									margin: 0,
								}}
							>
								Review renewal timing before it expires
							</p>
						</div>
						<button
							type="button"
							onClick={() => navigate(documentPath(nextExpiry.id))}
							style={{
								background: FC.amber,
								border: 'none',
								borderRadius: 11,
								padding: '5px 13px',
								cursor: 'pointer',
								flexShrink: 0,
								fontFamily: 'inherit',
							}}
						>
							<span style={{ color: '#000', fontSize: 12, fontWeight: 700 }}>
								Renew
							</span>
						</button>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
						<div
							style={{
								flex: 1,
								height: 4,
								borderRadius: 2,
								background: 'rgba(255,255,255,0.07)',
								overflow: 'hidden',
							}}
						>
							<div
								style={{
									width: `${expiryProgress.percent}%`,
									height: '100%',
									borderRadius: 2,
									background: `linear-gradient(90deg,${FC.amber},${FC.orange})`,
								}}
							/>
						</div>
						<span
							style={{
								color: 'rgba(255,255,255,0.28)',
								fontSize: 11,
								flexShrink: 0,
								whiteSpace: 'nowrap',
							}}
						>
							{expiryProgress.label}
						</span>
					</div>
				</div>
			) : null}

			<div style={{ marginBottom: 24 }}>
				<div style={{ marginBottom: 12 }}>
					<FigmaLbl>Categories</FigmaLbl>
				</div>
				<div
					style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
				>
					{categories.map((category) => (
						<div
							key={category.label}
							style={{
								position: 'relative',
								overflow: 'hidden',
								background: `linear-gradient(145deg,${category.color}10,${category.color}05)`,
								border: `1px solid ${category.color}20`,
								borderRadius: 22,
								padding: '18px 16px 16px',
								cursor: 'default',
								boxShadow:
									'0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
							}}
						>
							<span
								style={{
									position: 'absolute',
									right: -4,
									top: -8,
									fontSize: 72,
									fontWeight: 800,
									lineHeight: 1,
									color: category.color,
									opacity: 0.07,
									letterSpacing: -4,
									userSelect: 'none',
									pointerEvents: 'none',
								}}
							>
								{category.count}
							</span>
							<span
								style={{ fontSize: 22, display: 'block', marginBottom: 20 }}
							>
								{category.emoji}
							</span>
							<p
								style={{
									color: FC.fg,
									fontSize: 14.5,
									fontWeight: 700,
									letterSpacing: -0.3,
									marginBottom: 4,
									marginTop: 0,
								}}
							>
								{category.label}
							</p>
							<p
								style={{
									color: category.color,
									fontSize: 11.5,
									fontWeight: 600,
									margin: 0,
								}}
							>
								{category.count} files
							</p>
						</div>
					))}
				</div>
			</div>

			<div style={{ marginBottom: 20 }}>
				<div style={{ marginBottom: 12 }}>
					<FigmaLbl>Recent</FigmaLbl>
				</div>
				{recent.length === 0 ? (
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 22,
							padding: '18px 20px',
							color: FC.mid,
							fontSize: 14,
							lineHeight: 1.5,
						}}
					>
						Upload documents to see them here.
					</div>
				) : (
					<div
						style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}
					>
						{recent.map((document, index) => (
							<button
								key={document.id}
								type="button"
								onClick={() => navigate(documentPath(document.id))}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 13,
									padding: '14px 18px',
									borderBottom:
										index < recent.length - 1
											? '1px solid rgba(255,255,255,0.05)'
											: 'none',
									width: '100%',
									background: 'none',
									borderLeft: 'none',
									borderRight: 'none',
									borderTop: 'none',
									cursor: 'pointer',
									fontFamily: 'inherit',
									textAlign: 'left',
								}}
							>
								<div
									style={{
										width: 42,
										height: 42,
										borderRadius: 13,
										flexShrink: 0,
										background: `${document.color}12`,
										border: `1px solid ${document.color}22`,
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										justifyContent: 'center',
										gap: 1,
									}}
								>
									<FileText size={14} color={document.color} strokeWidth={2} />
									<span
										style={{
											color: document.color,
											fontSize: 8,
											fontWeight: 800,
											letterSpacing: '0.05em',
										}}
									>
										{document.fileType}
									</span>
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											display: 'flex',
											gap: 7,
											alignItems: 'center',
											marginBottom: 3,
										}}
									>
										<p
											style={{
												color: FC.fg,
												fontSize: 14,
												fontWeight: 500,
												margin: 0,
											}}
										>
											{document.title}
										</p>
										{document.warn ? (
											<div
												style={{
													background: FC.amber,
													borderRadius: 5,
													padding: '1px 6px',
													flexShrink: 0,
												}}
											>
												<span
													style={{
														color: '#000',
														fontSize: 9,
														fontWeight: 800,
														letterSpacing: '0.03em',
													}}
												>
													EXPIRES
												</span>
											</div>
										) : null}
									</div>
									<p
										style={{
											color: 'rgba(255,255,255,0.35)',
											fontSize: 12,
											margin: 0,
										}}
									>
										{document.subtitle}
									</p>
								</div>
								<ChevronRight size={14} color="rgba(255,255,255,0.18)" />
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
