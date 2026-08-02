import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES, healthSettingsSection } from '@/constants/routes'
import { ImportProgressList } from '@/features/health-import/components/ImportProgressList'
import { ImportSummaryCard } from '@/features/health-import/components/ImportSummaryCard'
import { useHealthImport } from '@/features/health-import/hooks/useHealthImport'

interface HealthImportWizardProps {
	userId: string
	onComplete?: () => void
}

export function HealthImportWizard({
	userId,
	onComplete,
}: HealthImportWizardProps) {
	const navigate = useNavigate()
	const importState = useHealthImport(userId)

	const step = importState.wizardStep

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 20,
				padding: 20,
				marginBottom: 24,
			}}
		>
			{step === 'welcome' && (
				<>
					<div
						style={{
							fontSize: 24,
							fontWeight: 800,
							color: C.text,
							marginBottom: 10,
						}}
					>
						Sync Health Reports
					</div>
					<div
						style={{
							fontSize: 14,
							color: C.textSec,
							lineHeight: 1.6,
							marginBottom: 20,
						}}
					>
						Chronicle will scan your configured Google Drive folders, score
						likely medical reports, and queue them for your review before
						import.
					</div>
					<button
						type="button"
						onClick={() => void importState.runDiscovery()}
						style={primaryButtonStyle}
					>
						Start Discovery
					</button>
				</>
			)}

			{step === 'discovery' && importState.discovery && (
				<>
					<div
						style={{
							fontSize: 20,
							fontWeight: 800,
							color: C.text,
							marginBottom: 14,
						}}
					>
						Discovery Complete
					</div>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: 10,
							marginBottom: 18,
						}}
					>
						<DiscoveryStat
							label="Folders"
							value={String(importState.discovery.folderCount)}
						/>
						<DiscoveryStat
							label="Medical"
							value={String(importState.discovery.medicalCount)}
						/>
						<DiscoveryStat
							label="Needs Review"
							value={String(importState.discovery.reviewCount)}
						/>
						<DiscoveryStat
							label="Ignored"
							value={String(importState.discovery.ignoredCount)}
						/>
					</div>
					<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
						<button
							type="button"
							onClick={() => navigate(healthSettingsSection('review'))}
							disabled={importState.discovery.pdfCount === 0}
							style={primaryButtonStyle}
						>
							Review {importState.discovery.pdfCount} Reports
						</button>
						<button
							type="button"
							onClick={() => void importState.startImport()}
							disabled={importState.discovery.pdfCount === 0}
							style={secondaryButtonStyle}
						>
							Import Approved Only
						</button>
					</div>
				</>
			)}

			{(step === 'import' || step === 'processing') && (
				<>
					<div
						style={{
							fontSize: 20,
							fontWeight: 800,
							color: C.text,
							marginBottom: 8,
						}}
					>
						Importing Health Reports
					</div>
					<div style={{ fontSize: 13, color: C.textSec, marginBottom: 16 }}>
						Downloading → OCR → Parsing → Metrics → Knowledge Graph
					</div>
					<ImportProgressList documents={importState.job?.documents ?? []} />
					<button
						type="button"
						onClick={importState.cancel}
						style={{ ...secondaryButtonStyle, marginTop: 14 }}
					>
						Cancel Import
					</button>
				</>
			)}

			{step === 'completion' && importState.summary && (
				<>
					<ImportSummaryCard summary={importState.summary} />
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
						<button
							type="button"
							onClick={() => {
								onComplete?.()
								navigate(ROUTES.health)
							}}
							style={primaryButtonStyle}
						>
							Open Health
						</button>
						<button
							type="button"
							onClick={() => navigate(ROUTES.ask)}
							style={secondaryButtonStyle}
						>
							Ask Chronicle
						</button>
					</div>
				</>
			)}

			{importState.error ? (
				<div style={{ fontSize: 12, color: C.red, marginTop: 12 }}>
					{importState.error}
				</div>
			) : null}
		</div>
	)
}

function DiscoveryStat({ label, value }: { label: string; value: string }) {
	return (
		<div
			style={{
				background: C.card2,
				borderRadius: 12,
				padding: '12px 14px',
				border: `1px solid ${C.border}`,
			}}
		>
			<div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>
				{label}
			</div>
			<div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
				{value}
			</div>
		</div>
	)
}

const primaryButtonStyle = {
	background: C.accent,
	border: 'none',
	borderRadius: 100,
	padding: '10px 18px',
	fontSize: 13,
	fontWeight: 700,
	color: C.white,
	cursor: 'pointer',
	fontFamily: 'inherit',
} as const

const secondaryButtonStyle = {
	background: C.card2,
	border: `1px solid ${C.border}`,
	borderRadius: 100,
	padding: '10px 18px',
	fontSize: 13,
	fontWeight: 700,
	color: C.textSec,
	cursor: 'pointer',
	fontFamily: 'inherit',
} as const
