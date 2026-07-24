import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Search } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { useMedicalDiscovery } from '@/features/medical-discovery/hooks/useMedicalDiscovery'
import type { DiscoveryFilterTab } from '@/features/medical-discovery/types/medical-discovery.types'

export function DiscoveryDashboardPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const discovery = useMedicalDiscovery(userId)

	if (!userId) {
		return null
	}

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.healthImport)}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: 0,
					marginBottom: 16,
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				Back
			</button>

			<div
				style={{
					fontSize: 34,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				Discovery Dashboard
			</div>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 20,
					lineHeight: 1.5,
				}}
			>
				Scan configured health folders and identify likely medical documents. No
				import or OCR happens here.
			</div>

			<div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
				<button
					type="button"
					onClick={() => void discovery.runScan('manual')}
					disabled={discovery.isScanning}
					style={primaryBtn(discovery.isScanning)}
				>
					{discovery.isScanning ? (
						<Loader2
							size={14}
							style={{ animation: 'spin 1s linear infinite' }}
						/>
					) : (
						<Search size={14} />
					)}
					{discovery.isScanning ? 'Scanning…' : 'Scan Folders'}
				</button>
				<button
					type="button"
					onClick={() => void discovery.runScan('incremental')}
					disabled={discovery.isScanning}
					style={secondaryBtn(discovery.isScanning)}
				>
					Incremental Scan
				</button>
				<button
					type="button"
					onClick={() => navigate(ROUTES.healthImportReview)}
					style={secondaryBtn(false)}
				>
					Review Reports
				</button>
			</div>

			{discovery.scanProgress ? (
				<div style={{ fontSize: 12, color: C.textSec, marginBottom: 12 }}>
					Scanned {discovery.scanProgress.scanned} of{' '}
					{discovery.scanProgress.total} files…
				</div>
			) : null}

			{discovery.error ? <ErrorBox message={discovery.error} /> : null}

			{discovery.stats ? (
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: 10,
						marginBottom: 16,
					}}
				>
					<StatCard label="Total Files" value={discovery.stats.totalFiles} />
					<StatCard
						label="Medical Reports"
						value={discovery.stats.medicalReports}
						color={C.greenAlt}
					/>
					<StatCard
						label="Needs Review"
						value={discovery.stats.needsReview}
						color={C.orange}
					/>
					<StatCard
						label="Ignored"
						value={discovery.stats.ignored}
						color={C.textMuted}
					/>
				</div>
			) : null}

			<FilterTabs filter={discovery.filter} onChange={discovery.setFilter} />

			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					overflow: 'hidden',
				}}
			>
				{discovery.files.length === 0 ? (
					<div
						style={{
							padding: 20,
							fontSize: 13,
							color: C.textMuted,
							textAlign: 'center',
						}}
					>
						No discovered files yet. Run a scan to find medical documents.
					</div>
				) : (
					discovery.files.map((file, index) => (
						<div
							key={file.fileId}
							style={{
								padding: '12px 16px',
								borderBottom:
									index < discovery.files.length - 1
										? `1px solid ${C.border}`
										: 'none',
							}}
						>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									gap: 12,
								}}
							>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontSize: 14,
											fontWeight: 600,
											color: C.text,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
										}}
									>
										{file.name}
									</div>
									<div
										style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}
									>
										{file.folderPath} · {file.mimeType}
									</div>
									<div style={{ fontSize: 11, color: C.textSec, marginTop: 4 }}>
										{file.reason}
									</div>
								</div>
								<div style={{ textAlign: 'right', flexShrink: 0 }}>
									<CategoryBadge category={file.category} />
									<div
										style={{
											fontSize: 12,
											fontWeight: 700,
											color: C.accent,
											marginTop: 4,
										}}
									>
										{file.confidence}%
									</div>
								</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	)
}

function FilterTabs({
	filter,
	onChange,
}: {
	filter: DiscoveryFilterTab
	onChange: (filter: DiscoveryFilterTab) => void
}) {
	const tabs: Array<{ id: DiscoveryFilterTab; label: string }> = [
		{ id: 'all', label: 'All' },
		{ id: 'likely_medical', label: 'Medical' },
		{ id: 'needs_review', label: 'Review' },
		{ id: 'ignored', label: 'Ignored' },
	]

	return (
		<div
			style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}
		>
			{tabs.map((tab) => (
				<button
					key={tab.id}
					type="button"
					onClick={() => onChange(tab.id)}
					style={{
						background: filter === tab.id ? C.accentDim : C.card2,
						border: `1px solid ${filter === tab.id ? 'rgba(108,111,255,0.35)' : C.border}`,
						borderRadius: 100,
						padding: '8px 12px',
						fontSize: 12,
						fontWeight: 700,
						color: filter === tab.id ? C.accent : C.textSec,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					{tab.label}
				</button>
			))}
		</div>
	)
}

function StatCard({
	label,
	value,
	color = C.text,
}: {
	label: string
	value: number
	color?: string
}) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				padding: '12px 14px',
			}}
		>
			<div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
				{label}
			</div>
			<div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
		</div>
	)
}

function CategoryBadge({ category }: { category: string }) {
	const colors: Record<string, string> = {
		likely_medical: C.greenAlt,
		needs_review: C.orange,
		ignored: C.textMuted,
	}

	return (
		<div
			style={{
				fontSize: 10,
				fontWeight: 700,
				color: colors[category] ?? C.textSec,
				textTransform: 'uppercase',
			}}
		>
			{category.replace('_', ' ')}
		</div>
	)
}

function ErrorBox({ message }: { message: string }) {
	return (
		<div
			style={{
				background: 'rgba(255,69,58,0.08)',
				border: '1px solid rgba(255,69,58,0.2)',
				borderRadius: 12,
				padding: '12px 14px',
				marginBottom: 12,
				fontSize: 13,
				color: C.red,
			}}
		>
			{message}
		</div>
	)
}

function primaryBtn(disabled: boolean) {
	return {
		display: 'inline-flex',
		alignItems: 'center',
		gap: 6,
		background: C.accent,
		border: 'none',
		borderRadius: 100,
		padding: '10px 14px',
		fontSize: 12,
		fontWeight: 700,
		color: C.white,
		cursor: disabled ? 'not-allowed' : 'pointer',
		fontFamily: 'inherit',
		opacity: disabled ? 0.6 : 1,
	} as const
}

function secondaryBtn(disabled: boolean) {
	return {
		display: 'inline-flex',
		alignItems: 'center',
		gap: 6,
		background: C.card2,
		border: `1px solid ${C.border}`,
		borderRadius: 100,
		padding: '10px 14px',
		fontSize: 12,
		fontWeight: 700,
		color: C.textSec,
		cursor: disabled ? 'not-allowed' : 'pointer',
		fontFamily: 'inherit',
		opacity: disabled ? 0.6 : 1,
	} as const
}
