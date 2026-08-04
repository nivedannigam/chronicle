import type { StructuredAskResponse } from '@/features/ask/types/structured-response.types'
import type { TrustResponse } from '@/features/ask/trust/trust.types'
import { AskSupportingReports } from '@/features/ask/components/AskSupportingReports'
import { AskMarkdownContent } from '@/features/ask/components/AskMarkdownContent'
import { FC } from '@/ui/figma/v2/atoms'

interface AskPremiumAnswerProps {
	structured: StructuredAskResponse
	trust?: TrustResponse
	/** Raw answer fallback when structured fields are sparse. */
	rawAnswer?: string
	isStreaming?: boolean
}

function AnswerSection({ title, items }: { title: string; items: string[] }) {
	if (items.length === 0) {
		return null
	}

	return (
		<div style={{ marginTop: 28 }}>
			<p
				style={{
					fontSize: 14,
					fontWeight: 600,
					color: FC.fg,
					margin: '0 0 10px',
					lineHeight: 1.4,
				}}
			>
				{title}
			</p>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 8,
				}}
			>
				{items.map((item) => (
					<p
						key={item}
						style={{
							fontSize: 15,
							color: FC.mid,
							lineHeight: 1.65,
							margin: 0,
						}}
					>
						{item}
					</p>
				))}
			</div>
		</div>
	)
}

function buildExplanationParagraphs(
	structured: StructuredAskResponse,
): string[] {
	const paragraphs: string[] = []

	if (structured.explanation?.trim()) {
		paragraphs.push(structured.explanation.trim())
	}

	for (const item of structured.whatItMayMean ?? []) {
		if (item.trim() && !paragraphs.includes(item.trim())) {
			paragraphs.push(item.trim())
		}
	}

	// Fold key findings into explanation prose when no dedicated explanation exists.
	if (paragraphs.length === 0 && structured.keyFindings.length > 0) {
		for (const item of structured.keyFindings.slice(0, 3)) {
			if (item.trim()) {
				paragraphs.push(item.trim())
			}
		}
	}

	return paragraphs
}

export function AskPremiumAnswer({
	structured,
	trust,
	rawAnswer,
	isStreaming = false,
}: AskPremiumAnswerProps) {
	const explanationParagraphs = buildExplanationParagraphs(structured)
	const whatChanged = structured.whatChanged ?? []
	const doctorDiscussion = structured.doctorDiscussion ?? []

	const directAnswer =
		structured.directAnswer.trim() ||
		rawAnswer?.trim() ||
		"I couldn't generate an answer for that question."

	return (
		<article
			style={{
				opacity: isStreaming ? 0.92 : 1,
				transition: 'opacity 0.2s ease',
			}}
		>
			<div
				style={{
					fontSize: 17,
					fontWeight: 500,
					color: FC.fg,
					lineHeight: 1.65,
					letterSpacing: -0.2,
				}}
			>
				<AskMarkdownContent content={directAnswer} />
			</div>

			{explanationParagraphs.length > 0 ? (
				<div
					style={{
						marginTop: 20,
						display: 'flex',
						flexDirection: 'column',
						gap: 12,
					}}
				>
					{explanationParagraphs.map((paragraph) => (
						<p
							key={paragraph}
							style={{
								fontSize: 15,
								color: FC.mid,
								lineHeight: 1.7,
								margin: 0,
							}}
						>
							{paragraph}
						</p>
					))}
				</div>
			) : null}

			<AnswerSection title="What changed?" items={whatChanged} />
			<AnswerSection
				title="What you should discuss with your doctor"
				items={doctorDiscussion}
			/>

			<AskSupportingReports trust={trust} />
		</article>
	)
}
