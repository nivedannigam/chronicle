import { C } from '@/constants/colors'
import type { ReportDisagreement } from '@/features/ask/trust/trust.types'
import { healthReportPath } from '@/constants/routes'
import { Link } from 'react-router-dom'

interface DisagreementPanelProps {
	disagreements: ReportDisagreement[]
}

export function DisagreementPanel({ disagreements }: DisagreementPanelProps) {
	if (disagreements.length === 0) {
		return null
	}

	return (
		<div
			style={{
				marginTop: 16,
				padding: '12px 14px',
				borderRadius: 14,
				border: `1px solid ${C.orange}44`,
				background: `${C.orange}12`,
			}}
		>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.08em',
					textTransform: 'uppercase',
					color: C.orange,
					marginBottom: 8,
				}}
			>
				Conflicting values in your records
			</div>

			{disagreements.map((item) => (
				<div key={item.id} style={{ marginBottom: 10 }}>
					<div
						style={{
							fontSize: 13,
							fontWeight: 600,
							color: C.text,
							marginBottom: 4,
						}}
					>
						{item.metricName}
					</div>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 4,
							marginBottom: 6,
						}}
					>
						{item.values.map((value) => (
							<div key={`${value.reportId}-${value.value}`}>
								<Link
									to={healthReportPath(value.reportId)}
									style={{
										fontSize: 12,
										color: C.accentBlue,
										textDecoration: 'none',
										fontWeight: 600,
									}}
								>
									{value.reportTitle}
								</Link>
								<span style={{ fontSize: 12, color: C.textSec }}>
									{' '}
									· {value.date} · {value.value}
									{value.status ? ` (${value.status})` : ''}
								</span>
							</div>
						))}
					</div>
					<div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.5 }}>
						{item.explanation}
					</div>
				</div>
			))}
		</div>
	)
}
