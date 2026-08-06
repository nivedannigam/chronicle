import { useNavigate } from 'react-router-dom'
import { INSURANCE_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import {
	InsuranceHomeEmptyState,
	InsuranceHomeSkeleton,
} from '@/features/insurance/components/InsuranceHomeStates'
import { FigmaInsurancePoliciesListView } from '@/ui/figma/insurance/FigmaInsurancePoliciesListView'

export function InsurancePoliciesPage() {
	const navigate = useNavigate()
	const { policies, hasPolicies, isLoading, isError, refetch } =
		useInsuranceContext()

	if (isLoading) {
		return <InsuranceHomeSkeleton />
	}

	if (isError) {
		return (
			<InsuranceHomeEmptyState
				emoji="⚠️"
				title="Could not load your policies"
				body="Check your connection and try again."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (!hasPolicies && policies.policyCards.length === 0) {
		return (
			<InsuranceHomeEmptyState
				emoji="📄"
				title={INSURANCE_COPY.emptyPoliciesTitle}
				body={INSURANCE_COPY.emptyPoliciesBody}
				primaryLabel={INSURANCE_COPY.connectFolder}
				onPrimary={() => navigate(ROUTES.insuranceSettings)}
			/>
		)
	}

	return <FigmaInsurancePoliciesListView />
}
