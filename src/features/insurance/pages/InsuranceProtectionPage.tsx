import { useNavigate } from 'react-router-dom'
import { INSURANCE_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import {
	InsuranceHomeEmptyState,
	InsuranceHomeSkeleton,
} from '@/features/insurance/components/InsuranceHomeStates'
import { FigmaInsuranceProtectionView } from '@/ui/figma/insurance/FigmaInsuranceProtectionView'

export function InsuranceProtectionPage() {
	const navigate = useNavigate()
	const {
		protection,
		hasPolicies,
		hasFolderAssigned,
		isProcessing,
		isLoading,
		isError,
		refetch,
	} = useInsuranceContext()

	if (isLoading) {
		return <InsuranceHomeSkeleton />
	}

	if (isError) {
		return (
			<InsuranceHomeEmptyState
				emoji="⚠️"
				title="Could not load protection data"
				body="Check your connection and try again."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (
		!hasPolicies &&
		protection.areas.every((area) => area.status === 'Missing')
	) {
		return (
			<InsuranceHomeEmptyState
				emoji="🛡️"
				title={
					hasFolderAssigned && isProcessing
						? 'Building your protection picture'
						: INSURANCE_COPY.emptyProtectionTitle
				}
				body={
					hasFolderAssigned && isProcessing
						? 'Chronicle is organizing policies from your connected insurance folder.'
						: INSURANCE_COPY.emptyProtectionBody
				}
				primaryLabel={
					hasFolderAssigned ? 'View settings' : INSURANCE_COPY.connectFolder
				}
				onPrimary={() => navigate(ROUTES.insuranceSettings)}
			/>
		)
	}

	return <FigmaInsuranceProtectionView protection={protection} />
}
