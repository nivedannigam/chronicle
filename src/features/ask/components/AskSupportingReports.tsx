import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
	groupSupportingReports,
	type SupportingReportGroup,
} from '@/features/ask/utils/supporting-reports.utils'
import type { TrustResponse } from '@/features/ask/trust/trust.types'
import { FC } from '@/ui/figma/v2/atoms'

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
		<div style={{ padding: '10px 0', borderTop: `1px solid ${FC.line}` }}>
			<div
				style={{
					fontSize: 14,
					fontWeight: 600,
					color: FC.fg,
					lineHeight: 1.4,
				}}
			>
				{report.title}
			</div>
			<div
				style={{
					fontSize: 12,
					color: FC.dim,
					marginTop: 2,
				}}
			>
				{formatReportDate(report.date)}
			</div>
			{report.metrics.length > 0 ? (
				<ul
					style={{
						margin: '8px 0 0',
						paddingLeft: 16,
						display: 'flex',
						flexDirection: 'column',
						gap: 3,
					}}
				>
					{report.metrics.map((metric) => (
						<li
							key={metric}
							style={{
								fontSize: 13,
								color: FC.mid,
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
		<div style={{ marginTop: 24 }}>
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
					fontSize: 13,
					fontWeight: 500,
					color: FC.mid,
				}}
			>
				{expanded ? (
					<ChevronDown size={14} color={FC.dim} />
				) : (
					<ChevronRight size={14} color={FC.dim} />
				)}
				View supporting reports ({reports.length})
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
