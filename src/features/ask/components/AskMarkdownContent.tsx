import { Fragment, type ReactNode } from 'react'
import { C } from '@/constants/colors'

function renderInline(text: string): ReactNode[] {
	const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)

	return parts.map((part, index) => {
		if (part.startsWith('`') && part.endsWith('`')) {
			return (
				<code
					key={index}
					style={{
						fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
						fontSize: '0.9em',
						background: C.card2,
						border: `1px solid ${C.border}`,
						borderRadius: 6,
						padding: '1px 5px',
					}}
				>
					{part.slice(1, -1)}
				</code>
			)
		}

		if (part.startsWith('**') && part.endsWith('**')) {
			return <strong key={index}>{part.slice(2, -2)}</strong>
		}

		if (part.startsWith('*') && part.endsWith('*')) {
			return <em key={index}>{part.slice(1, -1)}</em>
		}

		return <Fragment key={index}>{part}</Fragment>
	})
}

interface AskMarkdownContentProps {
	content: string
}

/** Lightweight markdown — bold, italic, inline code, fenced code, lists, headings. No HTML injection. */
export function AskMarkdownContent({ content }: AskMarkdownContentProps) {
	const lines = content.split('\n')
	const blocks: ReactNode[] = []
	let listItems: string[] = []
	let codeLines: string[] = []
	let inCodeBlock = false

	const flushList = () => {
		if (listItems.length === 0) {
			return
		}

		blocks.push(
			<ul
				key={`list-${blocks.length}`}
				style={{
					margin: '8px 0',
					paddingLeft: 20,
					display: 'flex',
					flexDirection: 'column',
					gap: 4,
				}}
			>
				{listItems.map((item, index) => (
					<li key={index} style={{ lineHeight: 1.55 }}>
						{renderInline(item)}
					</li>
				))}
			</ul>,
		)
		listItems = []
	}

	const flushCodeBlock = () => {
		if (codeLines.length === 0) {
			return
		}

		blocks.push(
			<pre
				key={`code-${blocks.length}`}
				style={{
					margin: '10px 0',
					padding: '12px 14px',
					borderRadius: 12,
					background: C.card2,
					border: `1px solid ${C.border}`,
					overflowX: 'auto',
					fontSize: 12,
					lineHeight: 1.55,
					fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
					color: C.text,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
				}}
			>
				<code>{codeLines.join('\n')}</code>
			</pre>,
		)
		codeLines = []
	}

	for (const line of lines) {
		const trimmed = line.trim()

		if (trimmed.startsWith('```')) {
			if (inCodeBlock) {
				flushCodeBlock()
				inCodeBlock = false
			} else {
				flushList()
				inCodeBlock = true
			}
			continue
		}

		if (inCodeBlock) {
			codeLines.push(line)
			continue
		}

		if (/^[-*]\s+/.test(trimmed)) {
			listItems.push(trimmed.replace(/^[-*]\s+/, ''))
			continue
		}

		flushList()

		if (!trimmed) {
			blocks.push(<div key={`spacer-${blocks.length}`} style={{ height: 8 }} />)
			continue
		}

		if (trimmed.startsWith('### ')) {
			blocks.push(
				<div
					key={`h3-${blocks.length}`}
					style={{ fontSize: 14, fontWeight: 700, margin: '10px 0 4px' }}
				>
					{renderInline(trimmed.slice(4))}
				</div>,
			)
			continue
		}

		if (trimmed.startsWith('## ')) {
			blocks.push(
				<div
					key={`h2-${blocks.length}`}
					style={{ fontSize: 15, fontWeight: 700, margin: '12px 0 4px' }}
				>
					{renderInline(trimmed.slice(3))}
				</div>,
			)
			continue
		}

		blocks.push(
			<p
				key={`p-${blocks.length}`}
				style={{ margin: '0 0 8px', lineHeight: 1.6 }}
			>
				{renderInline(trimmed)}
			</p>,
		)
	}

	flushList()
	flushCodeBlock()

	return (
		<div style={{ fontSize: 14, color: C.textSec, wordBreak: 'break-word' }}>
			{blocks}
		</div>
	)
}
