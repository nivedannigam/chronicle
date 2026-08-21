import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { documentPath, ROUTES } from '@/constants/routes'
import { useFinanceContext } from '@/features/finance/context/useFinanceContext'
import type { FinanceDocumentRef } from '@/features/finance-knowledge/types/finance-knowledge.types'
import { FinanceSectionLabel } from '@/ui/figma/finance/finance-ui'
import { FigmaScreenHeader } from '@/ui/figma/shell/FigmaScreenHeader'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

function formatDisplayDate(value: string | null): string | null {
	if (!value) return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString('en-US', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

function formatPeriod(start: string | null, end: string | null): string | null {
	const formattedStart = formatDisplayDate(start)
	const formattedEnd = formatDisplayDate(end)

	if (formattedStart && formattedEnd) {
		return `${formattedStart} – ${formattedEnd}`
	}

	return formattedStart ?? formattedEnd
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
	if (!value) return null

	return (
		<div style={{ marginBottom: 12 }}>
			<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 4px' }}>{label}</p>
			<p style={{ color: FC.fg, fontSize: 14, margin: 0 }}>{value}</p>
		</div>
	)
}

export function FinanceDocumentDetailPage() {
	const navigate = useNavigate()
	const { documentId = '' } = useParams()
	const { knowledge } = useFinanceContext()

	const record = useMemo(
		() =>
			knowledge.documents.find((doc) => doc.chronicleDocumentId === documentId),
		[knowledge.documents, documentId],
	)

	if (!record) {
		return (
			<div>
				<button
					type="button"
					onClick={() => navigate(ROUTES.finance)}
					style={{
						background: 'none',
						border: 'none',
						color: FC.dim,
						padding: 0,
						marginBottom: 16,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					← Finance
				</button>
				<p style={{ color: FC.dim, fontSize: 14 }}>Document not found.</p>
			</div>
		)
	}

	return <FinanceDocumentDetailView record={record} />
}

function FinanceDocumentDetailView({ record }: { record: FinanceDocumentRef }) {
	const navigate = useNavigate()

	return (
		<div style={{ paddingBottom: 24 }}>
			<FigmaScreenHeader
				title={record.displayLabel}
				onBack={() => navigate(ROUTES.finance)}
			/>

			<div
				style={{ ...figmaCardStyle, borderRadius: 20, padding: '18px 16px' }}
			>
				<FinanceSectionLabel>Document details</FinanceSectionLabel>
				<DetailRow label="Document type" value={record.subCategoryLabel} />
				<DetailRow label="Institution" value={record.institutionName} />
				<DetailRow
					label="Statement date"
					value={formatDisplayDate(record.statementDate)}
				/>
				<DetailRow
					label="Statement period"
					value={formatPeriod(
						record.statementPeriodStart,
						record.statementPeriodEnd,
					)}
				/>
				<DetailRow label="Linked account" value={record.linkedEntityName} />
				{record.extractionUserMessage ? (
					<p style={{ color: FC.dim, fontSize: 13, margin: '12px 0 0' }}>
						{record.extractionUserMessage}
					</p>
				) : null}
			</div>

			<div style={{ marginTop: 16 }}>
				<button
					type="button"
					onClick={() => navigate(documentPath(record.chronicleDocumentId))}
					style={{
						background: 'none',
						border: 'none',
						padding: 0,
						color: FC.fg,
						fontSize: 14,
						fontWeight: 600,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					View original document →
				</button>
			</div>
		</div>
	)
}
