import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { healthVisitPath } from '@/constants/routes'
import type { HealthStoryViewModel } from '@/features/health/services/health-story.mapper'
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

	return (
		<div style={{ paddingBottom: 24 }}>
			<p
				style={{
					color: FC.fg,
					fontSize: 28,
					fontWeight: 700,
					letterSpacing: -0.8,
					margin: '0 0 8px',
					lineHeight: 1.15,
				}}
			>
				{story.greeting}
			</p>
			<p
				style={{
					color: FC.mid,
					fontSize: 15,
					lineHeight: 1.5,
					margin: '0 0 28px',
				}}
			>
				{story.howAmIDoing}
			</p>

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

			{story.recommendations.length > 0 ? (
				<SectionBlock label="What to do next">
					<div style={{ display: 'grid', gap: 10 }}>
						{story.recommendations.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => {
									if (item.actionPath) {
										navigate(item.actionPath)
									}
								}}
								disabled={!item.actionPath}
								style={{
									...figmaCardStyle,
									borderRadius: 18,
									padding: '16px 18px',
									width: '100%',
									textAlign: 'left',
									cursor: item.actionPath ? 'pointer' : 'default',
									fontFamily: 'inherit',
									opacity: item.actionPath ? 1 : 0.92,
								}}
							>
								<p
									style={{
										color: FC.fg,
										fontSize: 15,
										fontWeight: 600,
										margin: 0,
									}}
								>
									{item.title}
								</p>
							</button>
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
					</div>
				</SectionBlock>
			) : null}
		</div>
	)
}
