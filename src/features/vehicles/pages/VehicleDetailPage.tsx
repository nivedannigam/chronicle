import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useVehicleContext } from '@/features/vehicles/context/VehicleContext'
import { buildVehicleDetailViewModel } from '@/features/vehicles/services/vehicle-detail.mapper'
import { VehicleHomeSkeleton } from '@/features/vehicles/components/VehicleHomeStates'
import { figmaCardStyle } from '@/ui/figma/v2/atoms'

export function VehicleDetailPage() {
	const navigate = useNavigate()
	const { vehicleSlug } = useParams<{ vehicleSlug: string }>()
	const { knowledge, isLoading } = useVehicleContext()

	const detail = useMemo(() => {
		if (!vehicleSlug) {
			return null
		}

		return buildVehicleDetailViewModel({
			knowledge,
			vehicleId: vehicleSlug,
		})
	}, [knowledge, vehicleSlug])

	if (isLoading) {
		return <VehicleHomeSkeleton />
	}

	if (!detail) {
		return (
			<div className="px-4 py-8 text-center text-white/70">
				<p>Vehicle not found.</p>
				<button
					type="button"
					className="mt-4 text-sm text-blue-400"
					onClick={() => navigate(ROUTES.vehicles)}
				>
					Back to Vehicles
				</button>
			</div>
		)
	}

	return (
		<div className="space-y-5 px-1 pb-8 pt-2">
			<div
				className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
				style={figmaCardStyle}
			>
				<p className="text-sm uppercase tracking-wide text-white/45">
					{detail.categoryLabel}
				</p>
				<h1 className="mt-1 text-2xl font-semibold text-white">
					{detail.displayName}
				</h1>
				<p className="mt-2 text-sm text-white/60">{detail.statusLabel}</p>
				<div className="mt-4 grid gap-2 text-sm text-white/75">
					<p>
						Registration ·{' '}
						{detail.registrationNumber ??
							'We have not found this information yet.'}
					</p>
					<p>
						Insurance ·{' '}
						{detail.insuranceExpiry ??
							'We have not found this information yet.'}
					</p>
					<p>
						PUC ·{' '}
						{detail.pucExpiry ?? 'We have not found this information yet.'}
					</p>
					<p>
						Last service ·{' '}
						{detail.lastServiceDate ??
							'We have not found this information yet.'}
					</p>
				</div>
			</div>

			<section className="space-y-3">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-white/45">
					Documents
				</h2>
				{detail.documents.length === 0 ? (
					<p className="text-sm text-white/60">No vehicle documents yet.</p>
				) : (
					detail.documents.map((document) => (
						<div
							key={document.id}
							className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
							style={figmaCardStyle}
						>
							<p className="font-medium text-white">{document.title}</p>
							<p className="mt-1 text-sm text-white/55">
								{document.typeLabel}
								{document.dateLabel ? ` · ${document.dateLabel}` : ''}
								{document.expiryLabel
									? ` · Expires ${document.expiryLabel}`
									: ''}
							</p>
							<p className="mt-1 text-xs text-white/40">
								{document.sourceLabel}
							</p>
						</div>
					))
				)}
			</section>
		</div>
	)
}
