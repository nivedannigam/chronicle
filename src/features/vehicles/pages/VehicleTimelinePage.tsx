import { useVehicleContext } from '@/features/vehicles/context/VehicleContext'
import { VehicleHomeSkeleton } from '@/features/vehicles/components/VehicleHomeStates'
import { figmaCardStyle } from '@/ui/figma/v2/atoms'

export function VehicleTimelinePage() {
	const { knowledge, isLoading, hasVehicles } = useVehicleContext()

	if (isLoading) {
		return <VehicleHomeSkeleton />
	}

	if (!hasVehicles) {
		return (
			<p className="px-2 py-8 text-sm text-white/60">
				Your vehicle timeline will appear once Chronicle understands your
				vehicles.
			</p>
		)
	}

	const eventsByYear = new Map<number, typeof knowledge.timeline>()

	for (const event of knowledge.timeline) {
		const existing = eventsByYear.get(event.year) ?? []
		existing.push(event)
		eventsByYear.set(event.year, existing)
	}

	return (
		<div className="space-y-6 px-1 pb-8 pt-2">
			{[...eventsByYear.entries()].map(([year, events]) => (
				<section key={year}>
					<h2 className="mb-3 text-lg font-semibold text-white">{year}</h2>
					<div className="space-y-3">
						{events.map((event) => (
							<div
								key={event.id}
								className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
								style={figmaCardStyle}
							>
								<p className="font-medium text-white">{event.title}</p>
								{event.description ? (
									<p className="mt-1 text-sm text-white/60">
										{event.description}
									</p>
								) : null}
							</div>
						))}
					</div>
				</section>
			))}
		</div>
	)
}
