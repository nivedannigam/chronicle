import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, MessageCircle } from 'lucide-react'
import type { HealthVisit } from '@/features/health/types/health-visit.types'
import { ROUTES, healthReportPath } from '@/constants/routes'
import {
	buildVisitAskSuggestions,
	buildVisitChronicleSummary,
} from '@/features/health/services/health-visit.mapper'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, FigmaIconBox, figmaCardStyle } from '@/ui/figma/v2/atoms'

export interface VisitResultMetric {
	id: string
	name: string
	value: string
	statusLabel: string
	reportTitle: string
}

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

function statusColor(status: HealthVisit['status']): string {
	switch (status) {
		case 'ready':
			return FC.green
		case 'organizing':
			return FC.amber
		case 'needs_help':
			return FC.orange
		default:
			return FC.mid
	}
}

export function FigmaHealthVisitDetailView({
	visit,
	results,
}: {
	visit: HealthVisit
	results: VisitResultMetric[]
}) {
	const navigate = useNavigate()
	const color = statusColor(visit.status)
	const chronicleSummary = buildVisitChronicleSummary(visit)
	const askSuggestions = buildVisitAskSuggestions(visit)

	return (
		<div style={{ paddingBottom: 32 }}>
			<div style={{ marginBottom: 24 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 24,
						fontWeight: 700,
						letterSpacing: -0.5,
						margin: '0 0 6px',
					}}
				>
					{visit.title}
				</p>
				<p style={{ color: FC.mid, fontSize: 13.5, margin: '0 0 10px' }}>
					{visit.displayDate} · {visit.hospital}
				</p>
				<span
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						background: `${color}14`,
						border: `1px solid ${color}30`,
						borderRadius: 100,
						padding: '4px 10px',
						color,
						fontSize: 11.5,
						fontWeight: 700,
					}}
				>
					{visit.statusLabel}
				</span>
			</div>

			<SectionBlock label="Visit summary">
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 20,
						padding: '18px 18px 16px',
					}}
				>
					<p
						style={{
							color: FC.mid,
							fontSize: 14,
							lineHeight: 1.6,
							margin: 0,
						}}
					>
						{visit.summaryParagraph}
					</p>
				</div>
			</SectionBlock>

			<SectionBlock label="Documents">
				<div style={{ display: 'grid', gap: 10 }}>
					{visit.documents.map((document) => (
						<button
							key={document.reportId}
							type="button"
							onClick={() => navigate(healthReportPath(document.reportId))}
							style={{
								...figmaCardStyle,
								borderRadius: 16,
								padding: '14px 16px',
								display: 'flex',
								alignItems: 'center',
								gap: 12,
								width: '100%',
								textAlign: 'left',
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							<FigmaIconBox color={FC.blue} size={36}>
								<FileText size={16} color={FC.blue} strokeWidth={1.8} />
							</FigmaIconBox>
							<div style={{ flex: 1, minWidth: 0 }}>
								<p
									style={{
										color: FC.fg,
										fontSize: 14,
										fontWeight: 600,
										margin: '0 0 2px',
									}}
								>
									{document.title}
								</p>
								<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>
									{document.documentType}
								</p>
							</div>
						</button>
					))}
				</div>
			</SectionBlock>

			<SectionBlock label="Results">
				{results.length === 0 ? (
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 16,
							padding: '16px 18px',
						}}
					>
						<p style={{ color: FC.mid, fontSize: 13.5, margin: 0 }}>
							No important results are available for this visit yet.
						</p>
					</div>
				) : (
					<div style={{ display: 'grid', gap: 8 }}>
						{results.map((metric) => (
							<div
								key={metric.id}
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
										margin: '0 0 4px',
									}}
								>
									{metric.name}
								</p>
								<p
									style={{
										color: FC.mid,
										fontSize: 13,
										margin: '0 0 2px',
									}}
								>
									{metric.value} · {metric.statusLabel}
								</p>
								<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>
									From {metric.reportTitle}
								</p>
							</div>
						))}
					</div>
				)}
			</SectionBlock>

			<SectionBlock label="Chronicle summary">
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 20,
						padding: '18px 18px 16px',
						background: `linear-gradient(145deg, ${FC.purple}10 0%, ${FC.blue}08 100%)`,
					}}
				>
					<p
						style={{
							color: FC.mid,
							fontSize: 14,
							lineHeight: 1.6,
							margin: 0,
						}}
					>
						{chronicleSummary}
					</p>
				</div>
			</SectionBlock>

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
							Ask about this visit
						</p>
					</div>
					<div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
						{askSuggestions.map((question) => (
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
						onClick={() =>
							navigate(
								`${ROUTES.healthAsk}?q=${encodeURIComponent(`Explain my ${visit.title.toLowerCase()}.`)}`,
							)
						}
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
