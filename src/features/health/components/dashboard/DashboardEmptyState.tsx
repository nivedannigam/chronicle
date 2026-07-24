import { C } from '@/constants/colors'

interface DashboardEmptyStateProps {
	title: string
	message: string
	emoji?: string
	actionLabel?: string
	onAction?: () => void
}

export function DashboardEmptyState({
	title,
	message,
	emoji = '📋',
	actionLabel,
	onAction,
}: DashboardEmptyStateProps) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px dashed ${C.border}`,
				borderRadius: 16,
				padding: '20px 16px',
				textAlign: 'center',
			}}
		>
			<div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
			<div
				style={{
					fontSize: 14,
					fontWeight: 700,
					color: C.text,
					marginBottom: 6,
				}}
			>
				{title}
			</div>
			<div
				style={{
					fontSize: 12,
					color: C.textMuted,
					lineHeight: 1.5,
					marginBottom: actionLabel ? 14 : 0,
				}}
			>
				{message}
			</div>
			{actionLabel && onAction ? (
				<button
					type="button"
					onClick={onAction}
					style={{
						background: C.accentDim,
						border: '1px solid rgba(108,111,255,0.25)',
						borderRadius: 100,
						padding: '8px 14px',
						fontSize: 12,
						fontWeight: 700,
						color: C.accent,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					{actionLabel}
				</button>
			) : null}
		</div>
	)
}

export function DashboardSkeleton() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
			{[1, 2, 3].map((section) => (
				<div key={section}>
					<div
						style={{
							height: 18,
							width: 140,
							background: 'rgba(255,255,255,0.06)',
							borderRadius: 8,
							marginBottom: 12,
							animation: 'pulse 1.5s ease-in-out infinite',
						}}
					/>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
							gap: 10,
						}}
					>
						{[1, 2].map((card) => (
							<div
								key={card}
								style={{
									height: 160,
									background: 'rgba(255,255,255,0.04)',
									borderRadius: 16,
									animation: 'pulse 1.5s ease-in-out infinite',
								}}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	)
}
