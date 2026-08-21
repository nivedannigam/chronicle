import type { CSSProperties, ReactNode, RefObject } from 'react'
import { Mic, Search, Send } from 'lucide-react'
import {
	FC,
	figmaCardStyle,
	figmaListRowBorder,
} from '@/ui/figma/tokens/figma-v2-tokens'

export { FC, figmaCardStyle, figmaListRowBorder }

export function FigmaLbl({ children }: { children: ReactNode }) {
	return (
		<span
			style={{
				color: 'rgba(255,255,255,0.28)',
				fontSize: 11,
				fontWeight: 600,
				letterSpacing: '0.09em',
				textTransform: 'uppercase',
			}}
		>
			{children}
		</span>
	)
}

export function FigmaIconBox({
	color,
	size = 44,
	children,
}: {
	color: string
	size?: number
	children: ReactNode
}) {
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: Math.round(size * 0.32),
				background: `${color}16`,
				border: `1px solid ${color}26`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
			}}
		>
			{children}
		</div>
	)
}

export function FigmaAskComposer({
	taRef,
	input,
	setInput,
	thinking,
	resize,
	send,
}: {
	taRef: RefObject<HTMLTextAreaElement | null>
	input: string
	setInput: (value: string) => void
	thinking: boolean
	resize: () => void
	send: (text?: string) => void
}) {
	const active = input.trim().length > 0 && !thinking

	return (
		<div
			style={{
				background: FC.surface,
				border: `1px solid ${input.trim() ? 'rgba(99,102,241,0.4)' : FC.line}`,
				borderRadius: 22,
				padding: '12px 14px 10px',
				boxShadow: input.trim() ? '0 0 0 3px rgba(99,102,241,0.08)' : 'none',
				transition: 'border-color 0.2s, box-shadow 0.2s',
			}}
		>
			<textarea
				ref={taRef}
				value={input}
				rows={1}
				aria-label="Ask a question"
				onChange={(event) => {
					setInput(event.target.value)
					resize()
				}}
				onKeyDown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault()
						send()
					}
				}}
				placeholder="Ask anything — Shift+Enter for new line"
				style={{
					width: '100%',
					background: 'none',
					border: 'none',
					outline: 'none',
					color: FC.fg,
					fontSize: 15,
					fontFamily: 'inherit',
					resize: 'none',
					lineHeight: 1.6,
					maxHeight: 140,
					overflowY: 'auto',
					display: 'block',
					boxSizing: 'border-box',
				}}
			/>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginTop: 10,
				}}
			>
				<div style={{ display: 'flex', gap: 6 }}>
					<button
						type="button"
						style={{
							width: 32,
							height: 32,
							borderRadius: 10,
							background: FC.ghost,
							border: 'none',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<Mic size={15} color={FC.dim} />
					</button>
					<button
						type="button"
						style={{
							width: 32,
							height: 32,
							borderRadius: 10,
							background: FC.ghost,
							border: 'none',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<Search size={15} color={FC.dim} />
					</button>
				</div>
				<button
					type="button"
					onClick={() => send()}
					disabled={!active}
					style={{
						height: 34,
						paddingInline: 18,
						borderRadius: 12,
						border: 'none',
						cursor: active ? 'pointer' : 'default',
						background: active
							? `linear-gradient(135deg,${FC.blue},${FC.indigo})`
							: FC.ghost,
						display: 'flex',
						alignItems: 'center',
						gap: 6,
						boxShadow: active ? '0 4px 14px rgba(59,130,246,0.38)' : 'none',
						transition: 'all 0.2s',
						fontFamily: 'inherit',
					}}
				>
					<span
						style={{
							color: active ? '#fff' : FC.dim,
							fontSize: 13,
							fontWeight: 600,
						}}
					>
						{thinking ? 'Thinking…' : 'Send'}
					</span>
					{!thinking ? (
						<Send size={13} color={active ? '#fff' : FC.dim} />
					) : null}
				</button>
			</div>
		</div>
	)
}

export const figmaScreenTitleStyle: CSSProperties = {
	color: FC.fg,
	fontSize: 34,
	fontWeight: 700,
	letterSpacing: -1.6,
	margin: 0,
}
