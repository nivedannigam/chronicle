import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, FileText, Search, X } from 'lucide-react'
import { documentPath, healthReportPath, ROUTES } from '@/constants/routes'
import { getRecentQuestions } from '@/features/ask/services/ask-history.service'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import {
	domainColor,
	domainLabel,
} from '@/features/search/services/global-search.service'
import { useGlobalSearch } from '@/features/search/hooks/useGlobalSearch'
import type { SemanticSearchHit } from '@/features/intelligence/types/intelligence.types'
import { FC, FigmaIconBox, FigmaLbl, figmaCardStyle } from '@/ui/figma/v2/atoms'

const BROWSE_CATEGORIES = [
	{ label: 'Health', emoji: '❤️', color: FC.green, domain: 'health' as const },
	{
		label: 'Documents',
		emoji: '📄',
		color: FC.purple,
		domain: 'documents' as const,
	},
	{
		label: 'Timeline',
		emoji: '🕐',
		color: FC.blue,
		domain: 'timeline' as const,
	},
]

function hitPath(hit: SemanticSearchHit): string | null {
	if (hit.domain === 'documents' && hit.reportId) {
		return documentPath(hit.reportId)
	}

	if (hit.domain === 'health' && hit.reportId) {
		return healthReportPath(hit.reportId)
	}

	if (hit.domain === 'photos') {
		return ROUTES.timeline
	}

	return `${ROUTES.ask}?q=${encodeURIComponent(hit.title)}`
}

export function FigmaSearchScreen() {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')
	const { results } = useGlobalSearch(query)
	const { data: documents = [] } = useMemberDocuments()
	const { data: reports = [] } = useMemberHealthReports()

	const recent = useMemo(
		() =>
			getRecentQuestions()
				.slice(0, 4)
				.map((item) => item.question),
		[],
	)

	const browse = useMemo(
		() =>
			BROWSE_CATEGORIES.map((category) => ({
				...category,
				count:
					category.domain === 'health'
						? reports.length
						: category.domain === 'documents'
							? documents.length
							: reports.length + documents.length,
			})),
		[documents.length, reports.length],
	)

	return (
		<div
			style={{
				flex: 1,
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
				minHeight: 0,
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 10,
					padding: '14px 20px 4px',
					flexShrink: 0,
				}}
			>
				<button
					type="button"
					onClick={() => navigate(-1)}
					aria-label="Go back"
					style={{
						width: 36,
						height: 36,
						borderRadius: 12,
						background: FC.surface,
						border: `1px solid ${FC.line}`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						cursor: 'pointer',
						flexShrink: 0,
					}}
				>
					<ArrowLeft size={17} color={FC.mid} />
				</button>
			</div>

			<div style={{ padding: '4px 20px 14px', flexShrink: 0 }}>
				<div
					style={{
						background: FC.surface,
						border: '1px solid rgba(59,130,246,0.3)',
						borderRadius: 20,
						padding: '13px 16px',
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						boxShadow: '0 0 0 3px rgba(59,130,246,0.06)',
					}}
				>
					<Search size={18} color={FC.blue} />
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search everything…"
						autoFocus
						style={{
							flex: 1,
							background: 'none',
							border: 'none',
							outline: 'none',
							color: FC.fg,
							fontSize: 16,
							fontFamily: 'inherit',
						}}
					/>
					{query ? (
						<button
							type="button"
							onClick={() => setQuery('')}
							aria-label="Clear search"
							style={{
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								padding: 0,
							}}
						>
							<X size={16} color={FC.mid} />
						</button>
					) : null}
				</div>
			</div>

			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					padding: '0 20px 24px',
					scrollbarWidth: 'none',
				}}
			>
				{results.length > 0 ? (
					<div
						style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}
					>
						{results.map((hit, index) => {
							const color = domainColor(hit.domain)
							const path = hitPath(hit)

							return (
								<button
									key={hit.id}
									type="button"
									onClick={() => path && navigate(path)}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 13,
										padding: '15px 20px',
										borderBottom:
											index < results.length - 1
												? '1px solid rgba(255,255,255,0.05)'
												: 'none',
										width: '100%',
										background: 'none',
										borderLeft: 'none',
										borderRight: 'none',
										borderTop: 'none',
										cursor: 'pointer',
										textAlign: 'left',
										fontFamily: 'inherit',
									}}
								>
									<FigmaIconBox color={color}>
										<FileText size={17} color={color} strokeWidth={1.8} />
									</FigmaIconBox>
									<div style={{ flex: 1, minWidth: 0 }}>
										<p
											style={{
												color: FC.fg,
												fontSize: 14,
												fontWeight: 500,
												marginBottom: 3,
												marginTop: 0,
											}}
										>
											{hit.title}
										</p>
										<p
											style={{
												color: FC.mid,
												fontSize: 12.5,
												margin: 0,
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
										>
											{hit.snippet || domainLabel(hit.domain)}
										</p>
									</div>
								</button>
							)
						})}
					</div>
				) : (
					<>
						{recent.length > 0 ? (
							<div style={{ marginBottom: 22 }}>
								<div style={{ marginBottom: 12 }}>
									<FigmaLbl>Recent</FigmaLbl>
								</div>
								<div
									style={{
										...figmaCardStyle,
										borderRadius: 22,
										overflow: 'hidden',
									}}
								>
									{recent.map((item, index) => (
										<button
											key={item}
											type="button"
											onClick={() => setQuery(item)}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: 13,
												padding: '13px 20px',
												borderBottom:
													index < recent.length - 1
														? '1px solid rgba(255,255,255,0.05)'
														: 'none',
												width: '100%',
												background: 'none',
												border: 'none',
												cursor: 'pointer',
												textAlign: 'left',
												fontFamily: 'inherit',
											}}
										>
											<Clock size={14} color={FC.mid} />
											<span
												style={{
													color: 'rgba(255,255,255,0.68)',
													fontSize: 14,
												}}
											>
												{item}
											</span>
										</button>
									))}
								</div>
							</div>
						) : null}

						<div>
							<div style={{ marginBottom: 12 }}>
								<FigmaLbl>Browse</FigmaLbl>
							</div>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: '1fr 1fr 1fr',
									gap: 8,
								}}
							>
								{browse.map((category) => (
									<button
										key={category.label}
										type="button"
										onClick={() => setQuery(category.label)}
										style={{
											position: 'relative',
											overflow: 'hidden',
											background: `linear-gradient(145deg,${category.color}10,${category.color}05)`,
											border: `1px solid ${category.color}20`,
											borderRadius: 18,
											padding: '14px 12px 12px',
											cursor: 'pointer',
											textAlign: 'left',
											fontFamily: 'inherit',
										}}
									>
										<span
											style={{
												position: 'absolute',
												right: -2,
												top: -4,
												fontSize: 44,
												fontWeight: 800,
												color: category.color,
												opacity: 0.08,
												lineHeight: 1,
												userSelect: 'none',
												pointerEvents: 'none',
												letterSpacing: -2,
											}}
										>
											{category.count}
										</span>
										<span
											style={{
												fontSize: 20,
												display: 'block',
												marginBottom: 8,
											}}
										>
											{category.emoji}
										</span>
										<p
											style={{
												color: FC.fg,
												fontSize: 12,
												fontWeight: 600,
												marginBottom: 2,
												marginTop: 0,
											}}
										>
											{category.label}
										</p>
										<p
											style={{
												color: category.color,
												fontSize: 10.5,
												fontWeight: 500,
												margin: 0,
											}}
										>
											{category.count}
										</p>
									</button>
								))}
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	)
}
