import { C } from '@/constants/colors'
import { figmaCardStyle } from '@/ui/figma/v2/atoms'

export function VehicleHomeEmptyState({
	emoji,
	title,
	body,
	primaryLabel,
	onPrimary,
}: {
	emoji: string
	title: string
	body: string
	primaryLabel?: string
	onPrimary?: () => void
}) {
	return (
		<div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
			<div className="mb-4 text-5xl">{emoji}</div>
			<h1 className="mb-3 text-2xl font-semibold text-white">{title}</h1>
			<p className="mb-8 text-base leading-relaxed text-white/65">{body}</p>
			{primaryLabel && onPrimary ? (
				<button
					type="button"
					onClick={onPrimary}
					className="rounded-2xl px-6 py-3 text-sm font-semibold text-white"
					style={{ backgroundColor: C.accentBlue }}
				>
					{primaryLabel}
				</button>
			) : null}
		</div>
	)
}

export function VehicleHomeSkeleton() {
	return (
		<div className="space-y-4 px-4 py-6">
			<div className="h-8 w-48 animate-pulse rounded-xl bg-white/10" />
			<div
				className="h-28 animate-pulse rounded-3xl bg-white/10"
				style={figmaCardStyle}
			/>
			<div
				className="h-28 animate-pulse rounded-3xl bg-white/10"
				style={figmaCardStyle}
			/>
		</div>
	)
}
