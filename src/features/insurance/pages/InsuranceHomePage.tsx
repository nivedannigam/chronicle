import { useNavigate } from 'react-router-dom'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import { INSURANCE_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { FigmaInsuranceHomeView } from '@/ui/figma/insurance/FigmaInsuranceHomeView'
import {
	InsuranceHomeEmptyState,
	InsuranceHomeSkeleton,
} from '@/features/insurance/components/InsuranceHomeStates'

export function InsuranceHomePage() {
	const navigate = useNavigate()
	const { home, hasPolicies, isLoading, isError, refetch } =
		useInsuranceContext()

	if (isLoading) {
		return <InsuranceHomeSkeleton />
	}

	if (isError) {
		return (
			<InsuranceHomeEmptyState
				emoji="⚠️"
				title="Could not load insurance data"
				body="Check your connection and try again."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (!hasPolicies) {
		return (
			<InsuranceHomeEmptyState
				emoji="🛡️"
				title={INSURANCE_COPY.emptyTitle}
				body={INSURANCE_COPY.emptyBody}
				primaryLabel={INSURANCE_COPY.connectFolder}
				onPrimary={() => navigate(ROUTES.insuranceSettings)}
				secondaryLabel={INSURANCE_COPY.dropPolicyHint}
				onSecondary={() => navigate(ROUTES.insuranceSettings)}
			/>
		)
	}

	return <FigmaInsuranceHomeView home={home} />
}
