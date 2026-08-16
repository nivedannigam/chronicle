import { useNavigate } from 'react-router-dom'
import { ROUTES, vehicleDetailPath } from '@/constants/routes'
import { C } from '@/constants/colors'
import { useVehicleContext } from '@/features/vehicles/context/VehicleContext'
import {
	VehicleHomeEmptyState,
	VehicleHomeSkeleton,
} from '@/features/vehicles/components/VehicleHomeStates'
import { figmaCardStyle } from '@/ui/figma/v2/atoms'

export function VehicleHomePage() {
	const navigate = useNavigate()
	const { home, hasVehicles, setupStatus, isLoading, isError, refetch } =
		useVehicleContext()

	if (isLoading) {
		return <VehicleHomeSkeleton />
	}

	if (isError) {
		return (
			<VehicleHomeEmptyState
				emoji="⚠️"
				title="Could not load vehicle data"
				body="Check your connection and try again."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (!hasVehicles) {
		return (
			<VehicleHomeEmptyState
				emoji="🚗"
				title="Your vehicles will appear here once Chronicle finds their documents."
				body={
					setupStatus === 'scanning'
						? 'Chronicle is organizing documents from your connected folder.'
						: 'Connect your Vehicles folder in Google Drive to get started.'
				}
				primaryLabel="Connect Vehicles folder"
				onPrimary={() => navigate(ROUTES.vehiclesSettings)}
			/>
		)
	}

	return (
		<div className="space-y-5 px-1 pb-8 pt-2">
			<div>
				<h1 className="text-2xl font-semibold text-white">{home.headline}</h1>
				{home.summaryLines.map((line) => (
					<p key={line} className="mt-1 text-sm text-white/60">
						{line}
					</p>
				))}
			</div>

			{home.attention.length > 0 ? (
				<div className="space-y-3">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-white/45">
						Needs attention
					</h2>
					{home.attention.map((item) => (
						<div
							key={item.id}
							className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
							style={figmaCardStyle}
						>
							<p className="text-sm font-semibold text-white">{item.title}</p>
							<p className="mt-1 text-sm text-white/60">{item.body}</p>
						</div>
					))}
				</div>
			) : null}

			<div className="space-y-3">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-white/45">
					Your vehicles
				</h2>
				{home.vehicleCards.map((vehicle) => (
					<button
						key={vehicle.id}
						type="button"
						onClick={() => navigate(vehicleDetailPath(vehicle.slug))}
						className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-white/20"
						style={figmaCardStyle}
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-lg font-semibold text-white">
									{vehicle.displayName}
								</p>
								<p className="mt-1 text-sm text-white/55">
									{vehicle.registrationLabel}
								</p>
							</div>
							<span
								className="rounded-full px-3 py-1 text-xs font-semibold"
								style={{
									backgroundColor: `${C.accentBlue}22`,
									color: C.accentBlue,
								}}
							>
								{vehicle.statusLabel}
							</span>
						</div>
						<div className="mt-4 grid gap-2 text-sm text-white/70">
							{vehicle.insuranceLabel ? (
								<p>Insurance · {vehicle.insuranceLabel}</p>
							) : null}
							{vehicle.pucLabel ? <p>PUC · {vehicle.pucLabel}</p> : null}
							<p>{vehicle.serviceLabel}</p>
							<p className="text-white/45">
								{vehicle.documentCount} document
								{vehicle.documentCount === 1 ? '' : 's'}
							</p>
						</div>
					</button>
				))}
			</div>
		</div>
	)
}
