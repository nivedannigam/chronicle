import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
	groupSupportingReports,
	type SupportingReportGroup,
} from '@/features/ask/utils/supporting-reports.utils'
import type { TrustResponse } from '@/features/ask/trust/trust.types'
import { AskColors, AskTypography } from '@/ui/figma/ask/ask-design-tokens'

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
					fontSize: 14,
					fontWeight: 500,
					color: AskColors.fg,
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
								fontSize: 13,
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
		<div style={{ marginTop: 20 }}>
			<button
				type="button"
				onClick={() => setExpanded((value) => !value)}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 6,
					padding: 0,
					background: 'transparent',
					border: 'none',
					cursor: 'pointer',
					fontFamily: 'inherit',
					...AskTypography.sectionTitle,
					color: AskColors.slate,
				}}
			>
				{expanded ? (
					<ChevronDown size={14} color={AskColors.neutral} />
				) : (
					<ChevronRight size={14} color={AskColors.neutral} />
				)}
				Supporting reports ({reports.length})
			</button>

			{expanded ? (
				<div style={{ marginTop: 4 }}>
					{reports.map((report) => (
						<ReportRow key={report.id} report={report} />
					))}
				</div>
			) : null}
		</div>
	)
}
