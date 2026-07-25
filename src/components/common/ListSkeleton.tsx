interface ListSkeletonProps {
	rows?: number
	height?: number
}

export function ListSkeleton({ rows = 4, height = 72 }: ListSkeletonProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
			{Array.from({ length: rows }, (_, index) => (
				<div
					key={index}
					style={{
						height,
						borderRadius: 16,
						background: 'rgba(255,255,255,0.04)',
						animation: 'pulse 1.5s ease-in-out infinite',
						animationDelay: `${index * 0.08}s`,
					}}
				/>
			))}
		</div>
	)
}
