import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, FileText, Search, Sparkles, X } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { getRecentQuestions } from '@/features/ask/services/ask-history.service'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { groupSearchResults } from '@/features/os/services/grouped-search.service'
import { domainColor } from '@/features/search/services/global-search.service'
import { useGlobalSearch } from '@/features/search/hooks/useGlobalSearch'
import {
	parseSearchContextModule,
	resolveSearchScopeCopy,
} from '@/features/search/services/search-context.service'
import { FigmaScreenHeader } from '@/ui/figma/shell/FigmaScreenHeader'
import { FC, FigmaIconBox, FigmaLbl, figmaCardStyle } from '@/ui/figma/v2/atoms'

const BROWSE_CATEGORIES = [
	{ label: 'Health', emoji: '❤️', color: FC.green },
	{ label: 'Insurance', emoji: '🛡️', color: FC.blue },
	{ label: 'Documents', emoji: '📄', color: FC.purple },
	{ label: 'People', emoji: '👨‍👩‍👧', color: FC.teal },
]

export function FigmaSearchScreen() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const searchContext = useMemo(
		() => parseSearchContextModule(searchParams.get('context')),
		[searchParams],
	)
	const scopeCopy = useMemo(
		() => resolveSearchScopeCopy(searchContext),
		[searchContext],
	)
	const [query, setQuery] = useState('')
	const { results, isLoading } = useGlobalSearch(query, searchContext)
	const { members } = useFamilyContext()
	const { data: documents = [] } = useMemberDocuments()
	const { data: reports = [] } = useMemberHealthReports()

	const groupedSections = useMemo(
		() =>
			groupSearchResults({
				query,
				hits: results,
				members,
			}),
		[query, results, members],
	)

	const recent = useMemo(
		() =>
			getRecentQuestions()
				.slice(0, 4)
				.map((item) => item.question),
		[],
	)

	const trimmedQuery = query.trim()
	const hasActiveQuery = trimmedQuery.length > 0
	const showEmptyResults =
		hasActiveQuery && !isLoading && groupedSections.length === 0

	const browse = useMemo(
		() =>
			BROWSE_CATEGORIES.map((category) => ({
				...category,
				count:
					category.label === 'Health'
						? reports.length
						: category.label === 'Documents'
							? documents.length
							: category.label === 'People'
								? members.length
								: 0,
			})),
		[documents.length, members.length, reports.length],
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
			<FigmaScreenHeader
				title={scopeCopy.title}
				subtitle={scopeCopy.subtitle ?? undefined}
				onBack={() => navigate(-1)}
				backLabel="Back"
				paddingBottom={12}
			/>

			<div style={{ padding: '0 22px 14px', flexShrink: 0 }}>
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
						placeholder={scopeCopy.placeholder}
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
					minHeight: 0,
					overflowY: 'auto',
					padding: '0 22px 24px',
					scrollbarWidth: 'none',
					WebkitOverflowScrolling: 'touch',
				}}
			>
				{isLoading && hasActiveQuery ? (
					<ListSkeleton rows={4} height={56} />
				) : groupedSections.length > 0 ? (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
						{groupedSections.map((section) => (
							<div key={section.id}>
								<div style={{ marginBottom: 10 }}>
									<FigmaLbl>
										{section.emoji} {section.label}
									</FigmaLbl>
								</div>
								<div
									style={{
										...figmaCardStyle,
										borderRadius: 22,
										overflow: 'hidden',
									}}
								>
									{section.results.map((result, index) => {
										const color =
											result.domain === 'family' || result.domain === 'ask'
												? FC.blue
												: domainColor(
														result.domain as import('@chronicle/core-knowledge').KnowledgeDomain,
													)

										return (
											<button
												key={result.id}
												type="button"
												onClick={() => navigate(result.path)}
												style={{
													display: 'flex',
													alignItems: 'center',
													gap: 13,
													padding: '15px 20px',
													borderBottom:
														index < section.results.length - 1
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
														{result.title}
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
														{result.subtitle}
													</p>
												</div>
											</button>
										)
									})}
								</div>
							</div>
						))}
					</div>
				) : showEmptyResults ? (
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 22,
							padding: '28px 20px',
							textAlign: 'center',
						}}
					>
						<Search size={28} color={FC.dim} style={{ marginBottom: 12 }} />
						<p
							style={{
								color: FC.fg,
								fontSize: 15,
								fontWeight: 600,
								margin: '0 0 8px',
							}}
						>
							No results for "{trimmedQuery}"
						</p>
						<p
							style={{
								color: FC.mid,
								fontSize: 13.5,
								lineHeight: 1.55,
								margin: '0 0 16px',
							}}
						>
							{scopeCopy.emptyMessage}
						</p>
						<button
							type="button"
							onClick={() =>
								navigate(`${ROUTES.ask}?q=${encodeURIComponent(trimmedQuery)}`)
							}
							style={{
								background: `${FC.indigo}14`,
								border: `1px solid ${FC.indigo}33`,
								borderRadius: 100,
								padding: '10px 18px',
								cursor: 'pointer',
								fontFamily: 'inherit',
								color: FC.indigo,
								fontSize: 13,
								fontWeight: 600,
								display: 'inline-flex',
								alignItems: 'center',
								gap: 8,
							}}
						>
							<Sparkles size={14} />
							Ask Chronicle
						</button>
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
									gridTemplateColumns: '1fr 1fr',
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
