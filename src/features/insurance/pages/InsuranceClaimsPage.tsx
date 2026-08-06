import { useNavigate } from 'react-router-dom'
import { INSURANCE_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import {
	InsuranceHomeEmptyState,
	InsuranceHomeSkeleton,
} from '@/features/insurance/components/InsuranceHomeStates'
import { FigmaInsuranceClaimsListView } from '@/ui/figma/insurance/FigmaInsuranceClaimsListView'

export function InsuranceClaimsPage() {
	const navigate = useNavigate()
	const { claims, hasClaims, hasPolicies, isLoading, isError, refetch } =
		useInsuranceContext()

	if (isLoading) {
		return <InsuranceHomeSkeleton />
	}

	if (isError) {
		return (
			<InsuranceHomeEmptyState
				emoji="⚠️"
				title="Could not load your claims"
				body="Check your connection and try again."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (!hasClaims && claims.claimCards.length === 0) {
		return (
			<InsuranceHomeEmptyState
				emoji="📋"
				title={INSURANCE_COPY.emptyClaimsTitle}
				body={INSURANCE_COPY.emptyClaimsBody}
				primaryLabel={
					hasPolicies
						? INSURANCE_COPY.viewPolicies
						: INSURANCE_COPY.connectFolder
				}
				onPrimary={() =>
					navigate(
						hasPolicies ? ROUTES.insurancePolicies : ROUTES.insuranceSettings,
					)
				}
			/>
		)
	}

	return <FigmaInsuranceClaimsListView />
}
