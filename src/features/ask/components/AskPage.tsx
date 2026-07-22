import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText, Send, Sparkles } from 'lucide-react'
import { C, pagePadding } from '@/constants/colors'
import {
	ASK_COPY,
	askPrompts,
	askRecents,
} from '@/features/ask/constants/mock-data'

export function AskPage() {
	const [query, setQuery] = useState('')
	const [expanded, setExpanded] = useState<number | null>(0)

	return (
		<div style={{ padding: pagePadding.ask, color: C.text }}>
			<div
				style={{
					width: 52,
					height: 52,
					borderRadius: 16,
					background: C.accentDim,
					border: `1px solid rgba(108,111,255,0.25)`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					marginBottom: 18,
					boxShadow: `0 0 24px rgba(108,111,255,0.20)`,
				}}
			>
				<Sparkles size={26} color={C.accent} />
			</div>

			<div
				style={{
					fontSize: 34,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					lineHeight: 1.05,
					marginBottom: 8,
				}}
			>
				{ASK_COPY.title}
			</div>
			<div
				style={{
					fontSize: 15,
					color: C.textSec,
					marginBottom: 28,
					lineHeight: 1.5,
				}}
			>
				{ASK_COPY.subtitleBefore}
				<em style={{ fontStyle: 'italic', color: C.text }}>
					{ASK_COPY.subtitleEmphasis}
				</em>
				{ASK_COPY.subtitleAfter}
			</div>

			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					padding: '14px 14px 12px',
					marginBottom: 20,
					position: 'relative',
					minHeight: 100,
				}}
			>
				<textarea
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={ASK_COPY.placeholder}
					style={{
						width: '100%',
						background: 'none',
						border: 'none',
						outline: 'none',
						fontSize: 15,
						color: C.text,
						fontFamily: 'inherit',
						resize: 'none',
						minHeight: 72,
						lineHeight: 1.55,
					}}
				/>
				<button
					type="button"
					style={{
						position: 'absolute',
						bottom: 12,
						right: 12,
						width: 36,
						height: 36,
						borderRadius: '50%',
						background: C.accent,
						border: 'none',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						boxShadow: `0 4px 16px rgba(108,111,255,0.35)`,
					}}
				>
					<Send size={16} color="white" strokeWidth={2} />
				</button>
			</div>

			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: 8,
					marginBottom: 30,
				}}
			>
				{askPrompts.map((prompt) => (
					<button
						key={prompt}
						type="button"
						onClick={() => setQuery(prompt)}
						style={{
							background: 'none',
							border: `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '8px 15px',
							fontSize: 13,
							color: C.textSec,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						{prompt}
					</button>
				))}
			</div>

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Recent
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{askRecents.map((recent, i) => (
					<div
						key={recent.q}
						style={{
							background: C.card,
							borderRadius: 18,
							overflow: 'hidden',
							border: `1px solid ${C.border}`,
						}}
					>
						<div
							onClick={() => setExpanded(expanded === i ? null : i)}
							style={{
								display: 'flex',
								alignItems: 'center',
								padding: '14px 16px',
								cursor: 'pointer',
								gap: 12,
							}}
						>
							<span
								style={{
									fontSize: 15,
									fontWeight: 600,
									color: C.text,
									flex: 1,
								}}
							>
								{recent.q}
							</span>
							<span
								style={{
									fontSize: 12,
									color: C.textMuted,
									flexShrink: 0,
								}}
							>
								{recent.when}
							</span>
							{expanded === i ? (
								<ChevronUp size={16} color={C.textMuted} />
							) : (
								<ChevronDown size={16} color={C.textMuted} />
							)}
						</div>
						{expanded === i && recent.answer && (
							<div
								style={{
									padding: '0 16px 14px',
									borderTop: `1px solid ${C.border}`,
									paddingTop: 12,
								}}
							>
								<div
									style={{
										display: 'flex',
										alignItems: 'flex-start',
										gap: 8,
									}}
								>
									<FileText
										size={14}
										color={C.accentBlue}
										style={{ flexShrink: 0, marginTop: 2 }}
									/>
									<span
										style={{
											fontSize: 13,
											color: C.textSec,
											lineHeight: 1.6,
										}}
									>
										{recent.answer}
									</span>
								</div>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}
