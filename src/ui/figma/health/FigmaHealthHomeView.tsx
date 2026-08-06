import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, MessageCircle, TrendingUp } from 'lucide-react'
import { healthAskPath, healthVisitPath, ROUTES } from '@/constants/routes'
import { ASK_EMPTY_SUGGESTIONS } from '@/features/ask/constants/ask-empty-state'
import type { HealthStoryViewModel } from '@/features/health/services/health-story.mapper'
import {
	FigmaHealthRing,
	FigmaHealthSectionLabel,
} from '@/ui/figma/health/figma-health-primitives'
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

function statusColor(status: string): string {
	switch (status) {
		case 'Excellent':
			return FC.green
		case 'Good':
			return FC.teal
		case 'Monitor':
			return FC.amber
		case 'Needs Attention':
			return FC.orange
		default:
			return FC.mid
	}
}

function changeIcon(
	tone: HealthStoryViewModel['sinceLastVisit'][number]['tone'],
) {
	switch (tone) {
		case 'improved':
			return '✓'
		case 'attention':
			return '⚠'
		default:
			return '✓'
	}
}

function changeColor(
	tone: HealthStoryViewModel['sinceLastVisit'][number]['tone'],
) {
	switch (tone) {
		case 'improved':
			return FC.green
		case 'attention':
			return FC.amber
		default:
			return FC.mid
	}
}

export function FigmaHealthHomeView({
	story,
}: {
	story: HealthStoryViewModel
}) {
	const navigate = useNavigate()
	const { snapshot } = story
	const ringColor = statusColor(snapshot.overallStatus)

	return (
		<div style={{ paddingBottom: 24 }}>
			<div
				style={{
					...figmaCardStyle,
					borderRadius: 28,
					padding: '24px 20px 22px',
					marginBottom: 28,
					background: `linear-gradient(155deg, ${ringColor}12 0%, ${FC.surface} 55%)`,
					border: `1px solid ${ringColor}28`,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: 18,
						marginBottom: 18,
					}}
				>
					<FigmaHealthRing score={snapshot.score} color={ringColor} />
					<div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
						<p
							style={{
								color: ringColor,
								fontSize: 13,
								fontWeight: 700,
								margin: '0 0 4px',
								letterSpacing: 0.2,
							}}
						>
							{snapshot.overallStatus}
						</p>
						<p
							style={{
								color: FC.fg,
								fontSize: 22,
								fontWeight: 700,
								letterSpacing: -0.5,
								margin: '0 0 8px',
								lineHeight: 1.15,
							}}
						>
							{story.greeting}
						</p>
						<p
							style={{
								color: FC.mid,
								fontSize: 14,
								lineHeight: 1.5,
								margin: 0,
							}}
						>
							{snapshot.overallSummary}
						</p>
					</div>
				</div>

				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: 8,
						marginBottom: 16,
					}}
				>
					<span
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 5,
							background: `${ringColor}14`,
							border: `1px solid ${ringColor}30`,
							borderRadius: 100,
							padding: '5px 11px',
							color: ringColor,
							fontSize: 12,
							fontWeight: 600,
						}}
					>
						<TrendingUp size={13} strokeWidth={2.2} />
						{snapshot.trendLabel}
					</span>
					{snapshot.latestReportDate ? (
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								background: FC.ghost,
								border: `1px solid ${FC.line}`,
								borderRadius: 100,
								padding: '5px 11px',
								color: FC.mid,
								fontSize: 12,
								fontWeight: 500,
							}}
						>
							Latest: {snapshot.latestReportDate}
						</span>
					) : null}
				</div>

				{snapshot.latestReportTitle ? (
					<div
						style={{
							borderTop: `1px solid ${FC.line}`,
							paddingTop: 14,
						}}
					>
						<p
							style={{
								color: FC.dim,
								fontSize: 11.5,
								fontWeight: 600,
								margin: '0 0 4px',
								textTransform: 'uppercase',
								letterSpacing: 0.6,
							}}
						>
							Latest checkup
						</p>
						<p
							style={{
								color: FC.fg,
								fontSize: 15,
								fontWeight: 600,
								margin: 0,
							}}
						>
							{snapshot.latestReportTitle}
						</p>
					</div>
				) : null}

				{snapshot.topRecommendationTitle ? (
					<button
						type="button"
						onClick={() => {
							if (snapshot.topRecommendationPath) {
								navigate(snapshot.topRecommendationPath)
							}
						}}
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							width: '100%',
							marginTop: 14,
							padding: '12px 14px',
							background: FC.ghost,
							border: `1px solid ${FC.line}`,
							borderRadius: 14,
							cursor: snapshot.topRecommendationPath ? 'pointer' : 'default',
							fontFamily: 'inherit',
							textAlign: 'left',
						}}
					>
						<span
							style={{
								color: FC.fg,
								fontSize: 13.5,
								fontWeight: 600,
								lineHeight: 1.4,
							}}
						>
							{snapshot.topRecommendationTitle}
						</span>
						{snapshot.topRecommendationPath ? (
							<ArrowRight size={15} color={FC.mid} />
						) : null}
					</button>
				) : null}
			</div>

			<SectionBlock label="Ask Chronicle">
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 22,
						padding: '20px 18px',
						background: `linear-gradient(145deg, ${FC.blue}14 0%, ${FC.teal}10 100%)`,
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
					<div
						style={{
							display: 'flex',
							flexWrap: 'wrap',
							gap: 8,
							marginBottom: 16,
						}}
					>
						{ASK_EMPTY_SUGGESTIONS.slice(0, 3).map((question) => (
							<button
								key={question}
								type="button"
								onClick={() => navigate(healthAskPath({ q: question }))}
								style={{
									background: FC.surface,
									border: `1px solid ${FC.line}`,
									borderRadius: 100,
									padding: '9px 14px',
									cursor: 'pointer',
									fontFamily: 'inherit',
									color: FC.mid,
									fontSize: 13,
									fontWeight: 500,
								}}
							>
								{question}
							</button>
						))}
					</div>
					<button
						type="button"
						onClick={() => navigate(healthAskPath())}
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

			<SectionBlock label="My health story">
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 24,
						padding: '22px 20px',
					}}
				>
					{story.storyParagraphs.map((paragraph) => (
						<p
							key={paragraph}
							style={{
								color: FC.mid,
								fontSize: 15,
								lineHeight: 1.65,
								margin: '0 0 14px',
							}}
						>
							{paragraph}
						</p>
					))}
				</div>
			</SectionBlock>

			{story.sinceLastVisit.length > 0 ? (
				<SectionBlock label="Since your last visit">
					<div style={{ display: 'grid', gap: 8 }}>
						{story.sinceLastVisit.map((item) => (
							<div
								key={item.id}
								style={{
									...figmaCardStyle,
									borderRadius: 16,
									padding: '14px 16px',
									display: 'flex',
									alignItems: 'center',
									gap: 10,
								}}
							>
								<span
									style={{
										color: changeColor(item.tone),
										fontSize: 15,
										fontWeight: 700,
										width: 18,
									}}
								>
									{changeIcon(item.tone)}
								</span>
								<span
									style={{
										color: FC.fg,
										fontSize: 14,
										fontWeight: 600,
									}}
								>
									{item.label}
								</span>
							</div>
						))}
					</div>
				</SectionBlock>
			) : null}

			{story.journeyVisits.length > 0 ? (
				<SectionBlock label="Recent health journey">
					<div style={{ position: 'relative', paddingLeft: 18 }}>
						<div
							style={{
								position: 'absolute',
								left: 4,
								top: 8,
								bottom: 8,
								width: 1,
								background: FC.line,
							}}
						/>
						{story.journeyVisits.map((visit, index) => (
							<div
								key={visit.id}
								style={{
									position: 'relative',
									marginBottom: index < story.journeyVisits.length - 1 ? 18 : 0,
								}}
							>
								<div
									style={{
										position: 'absolute',
										left: -18,
										top: 6,
										width: 8,
										height: 8,
										borderRadius: 4,
										background: FC.blue,
									}}
								/>
								<button
									type="button"
									onClick={() => navigate(healthVisitPath(visit.id))}
									style={{
										background: 'none',
										border: 'none',
										padding: 0,
										cursor: 'pointer',
										textAlign: 'left',
										fontFamily: 'inherit',
										width: '100%',
									}}
								>
									<p
										style={{
											color: FC.dim,
											fontSize: 12,
											fontWeight: 600,
											margin: '0 0 4px',
										}}
									>
										{visit.displayMonthYear}
									</p>
									<p
										style={{
											color: FC.fg,
											fontSize: 15,
											fontWeight: 600,
											margin: 0,
										}}
									>
										{visit.title}
									</p>
								</button>
							</div>
						))}
						<button
							type="button"
							onClick={() => navigate(ROUTES.healthHistory)}
							style={{
								marginTop: 16,
								background: 'none',
								border: 'none',
								padding: 0,
								cursor: 'pointer',
								fontFamily: 'inherit',
								color: FC.blue,
								fontSize: 13,
								fontWeight: 600,
							}}
						>
							View full history →
						</button>
					</div>
				</SectionBlock>
			) : null}
		</div>
	)
}
