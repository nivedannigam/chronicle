import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import {
	groupSupportingReports,
	type SupportingReportGroup,
} from '@/features/ask/utils/supporting-reports.utils'
import type { TrustResponse } from '@/features/ask/trust/trust.types'
import {
	AskColors,
	AskLayout,
	AskTypography,
} from '@/ui/figma/ask/ask-design-tokens'

interface AskSupportingReportsProps {
	trust: TrustResponse | undefined
}

function formatReportDate(value: string): string {
	const parsed = Date.parse(value)
	if (Number.isNaN(parsed)) {
		return value
	}

	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function ReportRow({ report }: { report: SupportingReportGroup }) {
	return (
		<div style={{ padding: '8px 0', borderTop: `1px solid ${AskColors.line}` }}>
			<div
				style={{
					fontSize: 13,
					fontWeight: 500,
					color: AskColors.mid,
					lineHeight: 1.4,
				}}
			>
				{report.title}
			</div>
			<div
				style={{
					fontSize: 12,
					color: AskColors.slate,
					marginTop: 2,
				}}
			>
				{formatReportDate(report.date)}
			</div>
			{report.metrics.length > 0 ? (
				<ul
					style={{
						margin: '6px 0 0',
						paddingLeft: 16,
						display: 'flex',
						flexDirection: 'column',
						gap: 2,
					}}
				>
					{report.metrics.map((metric) => (
						<li
							key={metric}
							style={{
								fontSize: 12,
								color: AskColors.neutral,
								lineHeight: 1.45,
							}}
						>
							{metric}
						</li>
					))}
				</ul>
			) : null}
		</div>
	)
}

export function AskSupportingReports({ trust }: AskSupportingReportsProps) {
	const [expanded, setExpanded] = useState(false)
	const reports = groupSupportingReports(trust)

	if (reports.length === 0) {
		return null
	}

	return (
		<div
			style={{
				marginTop: 24,
				borderRadius: AskLayout.sectionRadius,
				background: AskColors.cardElevated,
				border: `1px solid ${AskColors.line}`,
				overflow: 'hidden',
			}}
		>
			<button
				type="button"
				onClick={() => setExpanded((value) => !value)}
				style={{
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					padding: '12px 16px',
					background: 'transparent',
					border: 'none',
					cursor: 'pointer',
					fontFamily: 'inherit',
					textAlign: 'left',
				}}
			>
				<FileText size={14} color={AskColors.slate} />
				<span
					style={{
						...AskTypography.sectionTitle,
						color: AskColors.slate,
						flex: 1,
					}}
				>
					Supporting reports
					<span
						style={{
							fontWeight: 500,
							color: AskColors.dim,
							marginLeft: 6,
						}}
					>
						({reports.length})
					</span>
				</span>
				{expanded ? (
					<ChevronDown size={14} color={AskColors.neutral} />
				) : (
					<ChevronRight size={14} color={AskColors.neutral} />
				)}
			</button>

			{expanded ? (
				<div style={{ padding: '0 16px 12px' }}>
					{reports.map((report) => (
						<ReportRow key={report.id} report={report} />
					))}
				</div>
			) : null}
		</div>
	)
}
