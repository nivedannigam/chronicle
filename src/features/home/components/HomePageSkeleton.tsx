import { C, pagePadding } from '@/constants/colors'

function SkeletonBlock({
	height,
	radius = 16,
	marginBottom = 0,
}: {
	height: number
	radius?: number
	marginBottom?: number
}) {
	return (
		<div
			style={{
				height,
				borderRadius: radius,
				background: C.card,
				border: `1px solid ${C.border}`,
				opacity: 0.55,
				marginBottom,
			}}
		/>
	)
}

export function HomePageSkeleton() {
	return (
		<div style={{ padding: pagePadding.home, color: C.text }}>
			<SkeletonBlock height={72} radius={12} marginBottom={28} />
			<SkeletonBlock height={132} radius={22} marginBottom={28} />
			<SkeletonBlock height={88} radius={18} marginBottom={28} />
			<SkeletonBlock height={88} radius={18} marginBottom={28} />
			<SkeletonBlock height={132} radius={18} marginBottom={28} />
			<SkeletonBlock height={140} radius={20} marginBottom={28} />
			<SkeletonBlock height={100} radius={18} />
		</div>
	)
}
