import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

function PulseBlock({
	height,
	width = '100%',
	borderRadius = 16,
	marginBottom = 0,
}: {
	height: number
	width?: number | string
	borderRadius?: number
	marginBottom?: number
}) {
	return (
		<div
			style={{
				height,
				width,
				borderRadius,
				marginBottom,
				background: 'rgba(255,255,255,0.05)',
				animation: 'pulse 1.5s ease-in-out infinite',
			}}
		/>
	)
}

export function InsuranceHomeSkeleton() {
	return (
		<div style={{ paddingBottom: 24 }}>
			<div
				style={{
					...figmaCardStyle,
					borderRadius: 28,
					padding: '24px 20px',
					marginBottom: 28,
				}}
			>
				<div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
					<PulseBlock height={144} width={144} borderRadius={72} />
					<div style={{ flex: 1, paddingTop: 8 }}>
						<PulseBlock height={14} width="45%" marginBottom={10} />
						<PulseBlock height={24} width="80%" marginBottom={10} />
						<PulseBlock height={14} width="100%" marginBottom={6} />
						<PulseBlock height={14} width="70%" />
					</div>
				</div>
				<PulseBlock height={32} width="55%" borderRadius={100} />
			</div>

			<PulseBlock height={12} width={120} borderRadius={8} marginBottom={12} />
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
					gap: 10,
					marginBottom: 28,
				}}
			>
				{[1, 2, 3, 4].map((item) => (
					<PulseBlock key={item} height={72} borderRadius={16} />
				))}
			</div>

			<PulseBlock height={12} width={140} borderRadius={8} marginBottom={12} />
			<div style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
				{[1, 2, 3].map((item) => (
					<PulseBlock key={item} height={88} borderRadius={18} />
				))}
			</div>

			<PulseBlock height={12} width={120} borderRadius={8} marginBottom={12} />
			<div style={{ display: 'grid', gap: 8 }}>
				{[1, 2].map((item) => (
					<PulseBlock key={item} height={52} borderRadius={14} />
				))}
			</div>
		</div>
	)
}

export function InsuranceHomeEmptyState({
	emoji,
	title,
	body,
	primaryLabel,
	onPrimary,
	secondaryLabel,
	onSecondary,
}: {
	emoji: string
	title: string
	body: string
	primaryLabel: string
	onPrimary: () => void
	secondaryLabel?: string
	onSecondary?: () => void
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				textAlign: 'center',
				padding: '48px 12px 32px',
			}}
		>
			<div style={{ fontSize: 48, marginBottom: 16 }}>{emoji}</div>
			<h2
				style={{
					color: FC.fg,
					fontSize: 22,
					fontWeight: 700,
					margin: '0 0 10px',
					letterSpacing: -0.4,
				}}
			>
				{title}
			</h2>
			<p
				style={{
					color: FC.mid,
					fontSize: 14,
					lineHeight: 1.55,
					margin: '0 0 24px',
					maxWidth: 320,
				}}
			>
				{body}
			</p>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 10,
					width: '100%',
					maxWidth: 280,
				}}
			>
				<button
					type="button"
					onClick={onPrimary}
					style={{
						background: FC.blue,
						border: 'none',
						borderRadius: 14,
						padding: '13px 18px',
						color: '#fff',
						fontSize: 14,
						fontWeight: 700,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					{primaryLabel}
				</button>
				{secondaryLabel && onSecondary ? (
					<button
						type="button"
						onClick={onSecondary}
						style={{
							...figmaCardStyle,
							borderRadius: 14,
							padding: '13px 18px',
							color: FC.fg,
							fontSize: 14,
							fontWeight: 600,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						{secondaryLabel}
					</button>
				) : null}
			</div>
		</div>
	)
}
