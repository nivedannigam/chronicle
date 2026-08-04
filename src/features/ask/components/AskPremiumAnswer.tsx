import { useState, type ReactNode } from 'react'
import {
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Stethoscope,
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
				marginTop: 20,
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
						padding: canCollapse ? '0 16px 14px 36px' : '0 16px 14px 36px',
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
			/\b(high|low|critical|borderline|elevated|abnormal|above|below)\b/i.test(
				finding,
			)
		) {
			items.push(finding)
		}
	}

	if (structured.confidenceLevel === 'low' && items.length === 0) {
		items.push(...structured.keyFindings.slice(0, 3))
	}

	return [...new Set(items)].slice(0, 4)
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
	const doctorDiscussion = structured.doctorDiscussion ?? []
	const attentionItems = needsAttentionItems(structured)

	return (
		<article
			style={{
				opacity: isStreaming ? 0.94 : 1,
				transition: 'opacity 0.2s ease',
			}}
		>
			{/* Overall Summary */}
			<div
				style={{
					borderRadius: AskLayout.sectionRadius,
					background: AskColors.primaryMuted,
					borderLeft: `3px solid ${AskColors.primary}`,
					padding: '16px 18px',
				}}
			>
				<p
					style={{
						...AskTypography.sectionTitle,
						color: AskColors.primary,
						margin: '0 0 10px',
					}}
				>
					Overall Summary
				</p>
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

			{/* Key Findings */}
			<SectionBlock
				title="Key Findings"
				icon={<CheckCircle2 size={16} color={AskColors.positive} />}
				accentColor={AskColors.positive}
				items={keyFindings}
			/>

			{/* Needs Attention */}
			{attentionItems.length > 0 ? (
				<SectionBlock
					title="Needs Attention"
					accentColor={AskColors.attention}
					background={AskColors.attentionMuted}
					borderLeft={`3px solid ${AskColors.attention}`}
					items={attentionItems}
				/>
			) : null}

			{/* What Changed */}
			{whatChanged.length > 0 ? (
				<SectionBlock title="What Changed" items={whatChanged} />
			) : null}

			{/* Doctor Discussion — collapsed by default */}
			<SectionBlock
				title="What to discuss with your doctor"
				icon={<Stethoscope size={16} color="#A78BFA" />}
				accentColor="#A78BFA"
				background="rgba(139, 92, 246, 0.08)"
				borderLeft="3px solid #8B5CF6"
				items={doctorDiscussion}
				collapsedDefault
			/>

			<AskSupportingReports trust={trust} />
		</article>
	)
}
