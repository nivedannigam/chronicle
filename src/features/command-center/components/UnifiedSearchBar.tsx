import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { COMMAND_CENTER_COPY } from '@/constants/product-copy'
import { useUnifiedSearch } from '@/features/command-center/hooks/useUnifiedSearch'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'

const SOURCE_COLORS = {
	health: C.teal,
	documents: C.accent,
	timeline: C.accentBlue,
	family: C.accentBlue,
	ask: C.accent,
} as const

export function UnifiedSearchBar() {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')
	const results = useUnifiedSearch(query)
	const showResults = query.trim().length >= 2

	return (
		<section style={{ marginBottom: 24 }}>
			<HomeSectionLabel>{COMMAND_CENTER_COPY.searchLabel}</HomeSectionLabel>
			<div style={{ position: 'relative' }}>
				<Search
					size={16}
					color={C.textMuted}
					style={{
						position: 'absolute',
						left: 14,
						top: '50%',
						transform: 'translateY(-50%)',
					}}
				/>
				<input
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={COMMAND_CENTER_COPY.searchPlaceholder}
					style={{
						width: '100%',
						padding: '12px 14px 12px 40px',
						borderRadius: 14,
						border: `1px solid ${C.border}`,
						background: C.card,
						color: C.text,
						fontFamily: 'inherit',
						fontSize: 14,
					}}
				/>
			</div>

			{showResults ? (
				<div
					style={{
						marginTop: 8,
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 16,
						overflow: 'hidden',
					}}
				>
					{results.length === 0 ? (
						<div
							style={{ padding: '14px 16px', fontSize: 13, color: C.textMuted }}
						>
							No matches yet. Try Ask Chronicle for deeper questions.
						</div>
					) : (
						results.map((result, index) => (
							<button
								key={result.id}
								type="button"
								onClick={() => navigate(result.path)}
								style={{
									width: '100%',
									display: 'block',
									padding: '12px 16px',
									background: 'transparent',
									border: 'none',
									borderBottom:
										index === results.length - 1
											? 'none'
											: `1px solid ${C.border}`,
									cursor: 'pointer',
									textAlign: 'left',
									fontFamily: 'inherit',
								}}
							>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										gap: 8,
										marginBottom: 3,
									}}
								>
									<div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
										{result.title}
									</div>
									<span
										style={{
											fontSize: 10,
											fontWeight: 700,
											textTransform: 'uppercase',
											letterSpacing: '0.05em',
											color: SOURCE_COLORS[result.source],
											flexShrink: 0,
										}}
									>
										{result.sourceLabel}
									</span>
								</div>
								<div style={{ fontSize: 12, color: C.textMuted }}>
									{result.subtitle}
								</div>
							</button>
						))
					)}
					<button
						type="button"
						onClick={() =>
							navigate(ROUTES.ask, {
								state: { initialQuery: query.trim() },
							})
						}
						style={{
							width: '100%',
							padding: '10px 16px',
							background: `${C.accent}10`,
							border: 'none',
							borderTop: `1px solid ${C.border}`,
							color: C.accent,
							fontSize: 12,
							fontWeight: 700,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Ask Chronicle about "{query.trim()}"
					</button>
				</div>
			) : null}
		</section>
	)
}
