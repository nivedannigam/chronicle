import type { ReactNode } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { FC, figmaScreenTitleStyle } from '@/ui/figma/v2/atoms'

export function FigmaHeaderIconButton({
	onClick,
	ariaLabel,
	children,
}: {
	onClick: () => void
	ariaLabel: string
	children: ReactNode
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={ariaLabel}
			style={{
				width: 36,
				height: 36,
				borderRadius: 12,
				background: 'none',
				border: 'none',
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				transition: 'transform 0.18s ease, opacity 0.18s ease',
			}}
		>
			{children}
		</button>
	)
}

export function FigmaHeaderSearchButton({ onClick }: { onClick: () => void }) {
	return (
		<FigmaHeaderIconButton onClick={onClick} ariaLabel="Search">
			<Search size={20} color={FC.dim} strokeWidth={1.8} />
		</FigmaHeaderIconButton>
	)
}

export function FigmaScreenHeader({
	title,
	subtitle,
	onBack,
	backLabel = 'Back',
	leading,
	actions,
	children,
	paddingBottom = 18,
}: {
	title: string
	subtitle?: string
	onBack?: () => void
	backLabel?: string
	leading?: ReactNode
	actions?: ReactNode
	children?: ReactNode
	paddingBottom?: number
}) {
	return (
		<div
			style={{
				padding: `4px 22px ${paddingBottom}px`,
				flexShrink: 0,
			}}
		>
			{onBack ? (
				<button
					type="button"
					onClick={onBack}
					aria-label={backLabel}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						background: 'none',
						border: 'none',
						padding: '0 0 14px',
						cursor: 'pointer',
						color: FC.mid,
						fontFamily: 'inherit',
						fontSize: 14,
					}}
				>
					<ArrowLeft size={18} />
					{backLabel}
				</button>
			) : null}

			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					gap: 12,
					marginBottom: subtitle || children ? 0 : 0,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: 10,
						flex: 1,
						minWidth: 0,
					}}
				>
					{leading ? (
						<div style={{ flexShrink: 0, paddingTop: 2 }}>{leading}</div>
					) : null}
					<div style={{ flex: 1, minWidth: 0 }}>
						<h1 style={figmaScreenTitleStyle}>{title}</h1>
						{subtitle ? (
							<p
								style={{
									color: FC.mid,
									fontSize: 14,
									margin: '6px 0 0',
									lineHeight: 1.45,
								}}
							>
								{subtitle}
							</p>
						) : null}
					</div>
				</div>
				{actions ? (
					<div
						style={{
							display: 'flex',
							gap: 8,
							flexShrink: 0,
							paddingTop: 4,
						}}
					>
						{actions}
					</div>
				) : null}
			</div>

			{children}
		</div>
	)
}
