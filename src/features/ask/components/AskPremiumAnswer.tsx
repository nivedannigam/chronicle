import { useState, type ReactNode } from 'react'
import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	ClipboardList,
	Heart,
	Info,
	Lightbulb,
	TrendingUp,
} from 'lucide-react'
import type { StructuredAskResponse } from '@/features/ask/types/structured-response.types'
import type { TrustResponse } from '@/features/ask/trust/trust.types'
import { AskSupportingReports } from '@/features/ask/components/AskSupportingReports'
import { AskMarkdownContent } from '@/features/ask/components/AskMarkdownContent'
import {
	AskColors,
	AskLayout,
	AskTypography,
} from '@/ui/figma/ask/ask-design-tokens'

interface AskPremiumAnswerProps {
	structured: StructuredAskResponse
	trust?: TrustResponse
	rawAnswer?: string
	isStreaming?: boolean
}

function SectionBlock({
	title,
	icon,
	accentColor,
	background,
	borderLeft,
	items,
	collapsedDefault = false,
}: {
	title: string
	icon?: ReactNode
	accentColor?: string
	background?: string
	borderLeft?: string
	items: string[]
	collapsedDefault?: boolean
}) {
	const [expanded, setExpanded] = useState(!collapsedDefault)

	if (items.length === 0) {
		return null
	}

	const canCollapse = collapsedDefault

	return (
		<div
			style={{
				marginTop: 24,
				borderRadius: AskLayout.sectionRadius,
				background: background ?? AskColors.cardElevated,
				border: `1px solid ${AskColors.line}`,
				borderLeft: borderLeft ?? undefined,
				overflow: 'hidden',
			}}
		>
			{canCollapse ? (
				<button
					type="button"
					onClick={() => setExpanded((value) => !value)}
					style={{
						width: '100%',
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						padding: '14px 16px',
						background: 'transparent',
						border: 'none',
						cursor: 'pointer',
						fontFamily: 'inherit',
						textAlign: 'left',
					}}
				>
					{icon}
					<span
						style={{
							...AskTypography.sectionTitle,
							color: accentColor ?? AskColors.fg,
							flex: 1,
						}}
					>
						{title}
						{items.length > 1 ? (
							<span
								style={{
									fontWeight: 500,
									color: AskColors.dim,
									marginLeft: 6,
								}}
							>
								({items.length})
							</span>
						) : null}
					</span>
					{expanded ? (
						<ChevronDown size={16} color={AskColors.dim} />
					) : (
						<ChevronRight size={16} color={AskColors.dim} />
					)}
				</button>
			) : (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						padding: '14px 16px 10px',
					}}
				>
					{icon}
					<span
						style={{
							...AskTypography.sectionTitle,
							color: accentColor ?? AskColors.fg,
						}}
					>
						{title}
					</span>
				</div>
			)}

			{!canCollapse || expanded ? (
				<ul
					style={{
						margin: 0,
						padding: '0 16px 14px 36px',
						display: 'flex',
						flexDirection: 'column',
						gap: 8,
					}}
				>
					{items.map((item) => (
						<li
							key={item}
							style={{
								...AskTypography.body,
								color: AskColors.mid,
								lineHeight: 1.65,
							}}
						>
							<AskMarkdownContent content={item} />
						</li>
					))}
				</ul>
			) : null}
		</div>
	)
}

function needsAttentionItems(structured: StructuredAskResponse): string[] {
	const items: string[] = []

	for (const finding of structured.keyFindings) {
		if (
			/\b(high|low|critical|borderline|elevated|abnormal|above|below|watch|monitor)\b/i.test(
				finding,
			)
		) {
			items.push(finding)
		}
	}

	for (const finding of structured.evidenceFromReports ?? []) {
		if (
			/\b(high|low|critical|borderline|elevated|abnormal|above|below|watch|monitor)\b/i.test(
				finding,
			) &&
			!items.includes(finding)
		) {
			items.push(finding)
		}
	}

	return [...new Set(items)].slice(0, 4)
}

function buildThingsToWatch(structured: StructuredAskResponse): string[] {
	const items = [
		...needsAttentionItems(structured),
		...(structured.whatItMayMean ?? []),
	]

	for (const limitation of structured.limitations) {
		if (!/informational and not medical advice/i.test(limitation)) {
			items.push(limitation)
		}
	}

	if (structured.confidenceLevel === 'low' && items.length === 0) {
		items.push(
			structured.uncertaintyNote ??
				'A few details may be incomplete — worth confirming with your doctor.',
		)
	}

	return [...new Set(items)].slice(0, 5)
}

function buildRecommendationItems(structured: StructuredAskResponse): string[] {
	return [...new Set([...structured.recommendations])].slice(0, 5)
}

export function AskPremiumAnswer({
	structured,
	trust,
	rawAnswer,
	isStreaming = false,
}: AskPremiumAnswerProps) {
	const directAnswer =
		structured.directAnswer.trim() ||
		rawAnswer?.trim() ||
		"I couldn't generate an answer for that question."

	const keyFindings = structured.evidenceFromReports?.length
		? structured.evidenceFromReports
		: structured.keyFindings

	const whatChanged = structured.whatChanged ?? []
	const thingsToWatch = buildThingsToWatch(structured)
	const recommendations = buildRecommendationItems(structured)
	const doctorDiscussion = structured.doctorDiscussion ?? []

	return (
		<article
			style={{
				opacity: isStreaming ? 0.94 : 1,
				transition: 'opacity 0.2s ease',
			}}
		>
			{/* 1. Overall Assessment */}
			<div
				style={{
					borderRadius: AskLayout.sectionRadius,
					background: AskColors.primaryMuted,
					border: `1px solid rgba(59, 130, 246, 0.2)`,
					borderLeft: `3px solid ${AskColors.primary}`,
					padding: '18px 20px',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						marginBottom: 12,
					}}
				>
					<Heart size={16} color={AskColors.primary} />
					<p
						style={{
							...AskTypography.sectionTitle,
							color: AskColors.primary,
							margin: 0,
						}}
					>
						Overall Assessment
					</p>
				</div>
				<div
					style={{
						...AskTypography.answer,
						color: AskColors.fg,
					}}
				>
					<AskMarkdownContent content={directAnswer} />
					{isStreaming ? (
						<span
							className="ask-stream-cursor"
							style={{
								display: 'inline-block',
								width: 2,
								height: '1em',
								background: AskColors.primary,
								marginLeft: 2,
								verticalAlign: 'text-bottom',
								animation: 'ask-cursor-blink 1s step-end infinite',
							}}
						/>
					) : null}
				</div>
			</div>

			{/* 2. Key Findings — collapsed so evidence does not dominate */}
			<SectionBlock
				title="Key Findings"
				icon={<CheckCircle2 size={16} color={AskColors.positive} />}
				accentColor={AskColors.positive}
				background={AskColors.positiveMuted}
				borderLeft={`3px solid ${AskColors.positive}`}
				items={keyFindings}
				collapsedDefault={keyFindings.length > 0}
			/>

			{/* 3. What Changed */}
			{whatChanged.length > 0 ? (
				<SectionBlock
					title="What Changed"
					icon={<TrendingUp size={16} color={AskColors.info} />}
					accentColor={AskColors.info}
					background={AskColors.infoMuted}
					borderLeft={`3px solid ${AskColors.info}`}
					items={whatChanged}
				/>
			) : null}

			{/* 4. Things to Watch */}
			{thingsToWatch.length > 0 ? (
				<SectionBlock
					title="Things to Watch"
					icon={<AlertTriangle size={16} color={AskColors.attention} />}
					accentColor={AskColors.attention}
					background={AskColors.attentionMuted}
					borderLeft={`3px solid ${AskColors.attention}`}
					items={thingsToWatch}
				/>
			) : null}

			{/* 5. Recommendations */}
			{recommendations.length > 0 ? (
				<SectionBlock
					title="Recommendations"
					icon={<Lightbulb size={16} color={AskColors.primary} />}
					accentColor={AskColors.primary}
					background={AskColors.primaryMuted}
					borderLeft={`3px solid ${AskColors.primary}`}
					items={recommendations}
				/>
			) : null}

			{/* Doctor discussion — collapsed, secondary to recommendations */}
			{doctorDiscussion.length > 0 ? (
				<SectionBlock
					title="For your next doctor visit"
					icon={<ClipboardList size={16} color="#A78BFA" />}
					accentColor="#A78BFA"
					background="rgba(139, 92, 246, 0.08)"
					borderLeft="3px solid #8B5CF6"
					items={doctorDiscussion}
					collapsedDefault
				/>
			) : null}

			{/* 6. Supporting Reports — collapsed */}
			<AskSupportingReports trust={trust} />

			{structured.showSafetyFooter ? (
				<div
					style={{
						marginTop: 20,
						display: 'flex',
						alignItems: 'flex-start',
						gap: 8,
						padding: '12px 14px',
						borderRadius: AskLayout.sectionRadius,
						background: AskColors.cardElevated,
						border: `1px solid ${AskColors.line}`,
					}}
				>
					<Info size={14} color={AskColors.neutral} style={{ marginTop: 2 }} />
					<p
						style={{
							...AskTypography.body,
							fontSize: 13,
							color: AskColors.slate,
							margin: 0,
							lineHeight: 1.55,
						}}
					>
						This is informational and not medical advice. Always consult a
						healthcare professional for personal medical decisions.
					</p>
				</div>
			) : null}
		</article>
	)
}
