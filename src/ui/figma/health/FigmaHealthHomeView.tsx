import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { ROUTES, healthReportPath } from '@/constants/routes'
import type { HealthCompanionView } from '@/features/health/types/health-companion.types'
import {
	buildHealthGreeting,
	buildHealthSummarySentence,
	buildVisitSummarySentence,
	HEALTH_ASK_SUGGESTIONS,
	pickLatestVisit,
	formatChangeLabel,
} from '@/features/health/services/health-product.mapper'
import { figmaHealthScoreColor } from '@/ui/figma/health/figma-health-formatters'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

function SectionBlock({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	return (
		<section style={{ marginBottom: 28 }}>
			<div style={{ marginBottom: 12 }}>
				<FigmaHealthSectionLabel>{label}</FigmaHealthSectionLabel>
			</div>
			{children}
		</section>
	)
}

export function FigmaHealthHomeView({
	companion,
	memberName,
	hasReports,
}: {
	companion: HealthCompanionView
	memberName: string | null
	hasReports: boolean
}) {
	const navigate = useNavigate()
	const greeting = buildHealthGreeting(memberName)
	const summarySentence = buildHealthSummarySentence(
		companion.status,
		hasReports,
	)
	const latestVisit = pickLatestVisit(companion)
	const changes = companion.changes.slice(0, 3)
	const watchItems = companion.attention.slice(0, 4)
	const ringColor = figmaHealthScoreColor(companion.score)
	const showScore = companion.score !== null

	return (
		<div style={{ paddingBottom: 24 }}>
			<p
				style={{
					color: FC.fg,
					fontSize: 28,
					fontWeight: 700,
					letterSpacing: -0.8,
					margin: '0 0 28px',
					lineHeight: 1.15,
				}}
			>
				{greeting}
			</p>

			<SectionBlock label="Health summary">
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 24,
						padding: '22px 20px',
					}}
				>
					<p
						style={{
							color: FC.fg,
							fontSize: 20,
							fontWeight: 600,
							lineHeight: 1.35,
							margin: '0 0 16px',
							letterSpacing: -0.3,
						}}
					>
						{summarySentence}
					</p>
					{showScore ? (
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 10,
								borderTop: `1px solid ${FC.line}`,
								paddingTop: 14,
							}}
						>
							<span
								style={{
									color: ringColor,
									fontSize: 22,
									fontWeight: 700,
									lineHeight: 1,
								}}
							>
								{companion.score}
							</span>
							<span style={{ color: FC.dim, fontSize: 12.5 }}>
								Health score
							</span>
						</div>
					) : null}
				</div>
			</SectionBlock>

			{latestVisit ? (
				<SectionBlock label="Latest health visit">
					<button
						type="button"
						onClick={() => navigate(healthReportPath(latestVisit.id))}
						style={{
							...figmaCardStyle,
							borderRadius: 20,
							padding: '18px 18px 16px',
							width: '100%',
							textAlign: 'left',
							cursor: 'pointer',
							fontFamily: 'inherit',
							border: `1px solid ${FC.line}`,
						}}
					>
						<p
							style={{
								color: FC.fg,
								fontSize: 16,
								fontWeight: 700,
								margin: '0 0 6px',
							}}
						>
							{latestVisit.title}
						</p>
						<p style={{ color: FC.mid, fontSize: 12.5, margin: '0 0 10px' }}>
							{latestVisit.displayDate} · {latestVisit.hospital}
						</p>
						<p
							style={{
								color: FC.mid,
								fontSize: 13.5,
								lineHeight: 1.55,
								margin: 0,
							}}
						>
							{buildVisitSummarySentence(latestVisit)}
						</p>
					</button>
				</SectionBlock>
			) : null}

			{changes.length > 0 ? (
				<SectionBlock label="What's changed">
					<div style={{ display: 'grid', gap: 8 }}>
						{changes.map((change) => (
							<div
								key={change.id}
								style={{
									...figmaCardStyle,
									borderRadius: 16,
									padding: '14px 16px',
								}}
							>
								<p
									style={{
										color: FC.fg,
										fontSize: 14,
										fontWeight: 600,
										margin: 0,
										textTransform: 'capitalize',
									}}
								>
									{formatChangeLabel(change)}
								</p>
							</div>
						))}
					</div>
				</SectionBlock>
			) : null}

			{watchItems.length > 0 ? (
				<SectionBlock label="Things to watch">
					<div style={{ display: 'grid', gap: 10 }}>
						{watchItems.map((item) => (
							<div
								key={item.id}
								style={{
									...figmaCardStyle,
									borderRadius: 18,
									padding: '16px 18px',
								}}
							>
								<p
									style={{
										color: FC.fg,
										fontSize: 15,
										fontWeight: 600,
										margin: '0 0 4px',
									}}
								>
									{item.title}
								</p>
								<p
									style={{
										color: FC.mid,
										fontSize: 13,
										lineHeight: 1.45,
										margin: 0,
									}}
								>
									{item.detail}
								</p>
							</div>
						))}
					</div>
				</SectionBlock>
			) : null}

			<SectionBlock label="Ask Chronicle">
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 22,
						padding: '20px 18px',
						background: `linear-gradient(145deg, ${FC.blue}14 0%, ${FC.purple}10 100%)`,
						border: `1px solid ${FC.blue}25`,
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 10,
							marginBottom: 14,
						}}
					>
						<MessageCircle size={18} color={FC.blue} strokeWidth={2} />
						<p
							style={{
								color: FC.fg,
								fontSize: 16,
								fontWeight: 700,
								margin: 0,
							}}
						>
							Ask about your health
						</p>
					</div>
					<div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
						{HEALTH_ASK_SUGGESTIONS.map((question) => (
							<button
								key={question}
								type="button"
								onClick={() =>
									navigate(
										`${ROUTES.healthAsk}?q=${encodeURIComponent(question)}`,
									)
								}
								style={{
									background: FC.surface,
									border: `1px solid ${FC.line}`,
									borderRadius: 14,
									padding: '12px 14px',
									textAlign: 'left',
									cursor: 'pointer',
									fontFamily: 'inherit',
								}}
							>
								<span style={{ color: FC.mid, fontSize: 13.5 }}>
									{question}
								</span>
							</button>
						))}
					</div>
					<button
						type="button"
						onClick={() => navigate(ROUTES.healthAsk)}
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 6,
							width: '100%',
							background: FC.blue,
							border: 'none',
							borderRadius: 14,
							padding: '12px 0',
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						<span style={{ color: '#fff', fontSize: 13.5, fontWeight: 700 }}>
							Open Ask
						</span>
						<ArrowRight size={14} color="#fff" />
					</button>
				</div>
			</SectionBlock>
		</div>
	)
}
