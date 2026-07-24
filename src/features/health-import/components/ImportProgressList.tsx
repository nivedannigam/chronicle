import { C } from '@/constants/colors'
import { IMPORT_QUEUE_LABELS } from '@/core/connectors'
import type { HealthImportDocumentProgress } from '@/features/health-import/types/health-import.types'

function formatElapsed(ms: number): string {
	const seconds = Math.round(ms / 1000)

	if (seconds < 60) {
		return `${seconds}s`
	}

	return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

interface ImportDocumentRowProps {
	document: HealthImportDocumentProgress
}

export function ImportDocumentRow({ document }: ImportDocumentRowProps) {
	const isFailed = document.status === 'failed'
	const isComplete = document.status === 'completed'

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 6,
				padding: '12px 14px',
				borderRadius: 14,
				background: C.card2,
				border: `1px solid ${isFailed ? `${C.red}44` : C.border}`,
			}}
		>
			<div
				style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
			>
				<div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
					{document.fileName}
				</div>
				<div
					style={{
						fontSize: 11,
						fontWeight: 700,
						color: isFailed ? C.red : isComplete ? C.greenAlt : C.accentBlue,
					}}
				>
					{IMPORT_QUEUE_LABELS[document.status] ?? document.stageLabel}
				</div>
			</div>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					fontSize: 11,
					color: C.textMuted,
				}}
			>
				<span>{document.stageLabel}</span>
				<span>{formatElapsed(document.elapsedMs)}</span>
			</div>
			{document.errorMessage ? (
				<div style={{ fontSize: 11, color: C.red }}>
					{document.errorMessage}
				</div>
			) : null}
		</div>
	)
}

interface ImportProgressListProps {
	documents: HealthImportDocumentProgress[]
}

export function ImportProgressList({ documents }: ImportProgressListProps) {
	if (documents.length === 0) {
		return (
			<div style={{ fontSize: 13, color: C.textMuted, padding: '8px 0' }}>
				No documents in queue yet.
			</div>
		)
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
			{documents.map((document) => (
				<ImportDocumentRow key={document.registryId} document={document} />
			))}
		</div>
	)
}
