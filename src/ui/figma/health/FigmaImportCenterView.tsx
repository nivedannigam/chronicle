import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, FolderInput, RefreshCw } from 'lucide-react'
import { healthVisitPath } from '@/constants/routes'
import type {
	ImportCenterViewModel,
	ImportHelpItem,
} from '@/features/health-import/services/import-center.mapper'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function FigmaImportCenterView({
	view,
	busyItemId,
	onKeep,
	onIgnore,
	onChooseMember,
	onTryAgain,
	onMove,
}: {
	view: ImportCenterViewModel
	busyItemId: string | null
	onKeep: (registryId: string | null) => void
	onIgnore: (registryId: string | null) => void
	onChooseMember: (registryId: string | null, memberId: string) => void
	onTryAgain: (input: {
		registryId: string | null
		reportId: string | null
		itemId: string
	}) => void
	onMove: () => void
}) {
	const navigate = useNavigate()

	return (
		<div style={{ paddingBottom: 32 }}>
			<p
				style={{
					color: FC.mid,
					fontSize: 14,
					lineHeight: 1.55,
					margin: '0 0 28px',
				}}
			>
				Chronicle quietly organizes your health records in the background. This
				page only appears when something needs you.
			</p>

			<Section label="Recently imported">
				{view.recentlyImported.length === 0 ? (
					<EmptySection message="Nothing new yet. Chronicle will add visits here when it finds them." />
				) : (
					view.recentlyImported.map((item) => (
						<button
							key={item.id}
							type="button"
							onClick={() => navigate(healthVisitPath(item.visitId))}
							style={{
								...figmaCardStyle,
								borderRadius: 18,
								padding: '16px 18px',
								width: '100%',
								textAlign: 'left',
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'flex-start',
									gap: 10,
								}}
							>
								<Check size={18} color={FC.green} strokeWidth={2.2} />
								<div>
									<p
										style={{
											color: FC.fg,
											fontSize: 15,
											fontWeight: 700,
											margin: '0 0 4px',
										}}
									>
										{item.title}
									</p>
									<p
										style={{
											color: FC.mid,
											fontSize: 12.5,
											margin: '0 0 2px',
										}}
									>
										{item.displayMonthYear} · {item.reportCount} document
										{item.reportCount === 1 ? '' : 's'}
									</p>
									<p style={{ color: FC.green, fontSize: 12, margin: 0 }}>
										{item.summaryLine}
									</p>
								</div>
							</div>
						</button>
					))
				)}
			</Section>

			<Section label="Still organizing">
				{view.stillOrganizing.length === 0 ? (
					<EmptySection message="Nothing waiting right now." />
				) : (
					view.stillOrganizing.map((item) => (
						<div
							key={item.id}
							style={{
								...figmaCardStyle,
								borderRadius: 18,
								padding: '16px 18px',
							}}
						>
							<p
								style={{
									color: FC.fg,
									fontSize: 15,
									fontWeight: 600,
									margin: '0 0 4px',
								}}
							>
								{item.title}
							</p>
							<p style={{ color: FC.amber, fontSize: 13, margin: 0 }}>
								{item.statusLine}
							</p>
						</div>
					))
				)}
			</Section>

			<Section label="Needs your help">
				{view.needsHelp.length === 0 ? (
					<EmptySection message="Chronicle has everything it needs for now." />
				) : (
					view.needsHelp.map((item) => (
						<HelpCard
							key={item.id}
							item={item}
							isBusy={busyItemId === item.id || busyItemId === item.registryId}
							onKeep={() => onKeep(item.registryId)}
							onIgnore={() => onIgnore(item.registryId)}
							onChooseMember={(memberId) =>
								onChooseMember(item.registryId, memberId)
							}
							onTryAgain={() =>
								onTryAgain({
									registryId: item.registryId,
									reportId: item.reportId,
									itemId: item.id,
								})
							}
							onMove={onMove}
						/>
					))
				)}
			</Section>
		</div>
	)
}

function Section({ label, children }: { label: string; children: ReactNode }) {
	return (
		<section style={{ marginBottom: 28 }}>
			<div style={{ marginBottom: 12 }}>
				<FigmaHealthSectionLabel>{label}</FigmaHealthSectionLabel>
			</div>
			<div style={{ display: 'grid', gap: 10 }}>{children}</div>
		</section>
	)
}

function EmptySection({ message }: { message: string }) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 16,
				padding: '16px 18px',
			}}
		>
			<p style={{ color: FC.dim, fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>
				{message}
			</p>
		</div>
	)
}

function HelpCard({
	item,
	isBusy,
	onKeep,
	onIgnore,
	onChooseMember,
	onTryAgain,
	onMove,
}: {
	item: ImportHelpItem
	isBusy: boolean
	onKeep: () => void
	onIgnore: () => void
	onChooseMember: (memberId: string) => void
	onTryAgain: () => void
	onMove: () => void
}) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 18,
				padding: '16px 18px',
				border: `1px solid ${FC.amber}25`,
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 15,
					fontWeight: 600,
					margin: '0 0 6px',
				}}
			>
				{item.title}
			</p>
			<p
				style={{
					color: FC.mid,
					fontSize: 14,
					lineHeight: 1.5,
					margin: '0 0 12px',
				}}
			>
				{item.question}
			</p>
			{item.subtitle ? (
				<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 12px' }}>
					{item.subtitle}
				</p>
			) : null}

			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
				{item.kind === 'choose_member' &&
					item.memberOptions?.map((member) => (
						<ActionButton
							key={member.id}
							label={member.label}
							disabled={isBusy}
							onClick={() => onChooseMember(member.id)}
						/>
					))}

				{item.kind === 'not_medical' ? (
					<>
						<ActionButton
							label="Keep"
							tone="primary"
							disabled={isBusy}
							onClick={onKeep}
						/>
						<ActionButton label="Ignore" disabled={isBusy} onClick={onIgnore} />
					</>
				) : null}

				{item.kind === 'unreadable_document' ? (
					<>
						<ActionButton
							label={isBusy ? 'Trying again…' : 'Try again'}
							icon={<RefreshCw size={14} />}
							disabled={isBusy}
							onClick={onTryAgain}
						/>
						<ActionButton
							label="Move"
							icon={<FolderInput size={14} />}
							disabled={isBusy}
							onClick={onMove}
						/>
						{item.registryId ? (
							<ActionButton
								label="Ignore"
								disabled={isBusy}
								onClick={onIgnore}
							/>
						) : null}
					</>
				) : null}
			</div>
		</div>
	)
}

function ActionButton({
	label,
	onClick,
	disabled,
	tone,
	icon,
}: {
	label: string
	onClick: () => void
	disabled?: boolean
	tone?: 'primary'
	icon?: ReactNode
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				background: tone === 'primary' ? FC.blue : FC.ghost,
				color: tone === 'primary' ? '#fff' : FC.fg,
				border: tone === 'primary' ? 'none' : `1px solid ${FC.line}`,
				borderRadius: 100,
				padding: '8px 14px',
				fontSize: 12.5,
				fontWeight: 600,
				cursor: disabled ? 'default' : 'pointer',
				opacity: disabled ? 0.6 : 1,
				fontFamily: 'inherit',
			}}
		>
			{icon}
			{label}
		</button>
	)
}
