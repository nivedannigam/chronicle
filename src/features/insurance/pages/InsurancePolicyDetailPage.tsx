import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import {
	InsuranceHomeEmptyState,
	InsuranceHomeSkeleton,
} from '@/features/insurance/components/InsuranceHomeStates'
import { FigmaInsurancePolicyDetailView } from '@/ui/figma/insurance/FigmaInsurancePolicyDetailView'

export function InsurancePolicyDetailPage() {
	const navigate = useNavigate()
	const { policyId } = useParams<{ policyId: string }>()
	const { getPolicyDetail, isLoading, isError, refetch } = useInsuranceContext()

	if (isLoading) {
		return <InsuranceHomeSkeleton />
	}

	if (isError) {
		return (
			<InsuranceHomeEmptyState
				emoji="⚠️"
				title="Could not load this policy"
				body="Check your connection and try again."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (!policyId) {
		return <Navigate to={ROUTES.insurancePolicies} replace />
	}

	const detail = getPolicyDetail(policyId)

	if (!detail) {
		return <Navigate to={ROUTES.insurancePolicies} replace />
	}

	return (
		<FigmaInsurancePolicyDetailView
			detail={detail}
			onBack={() => navigate(ROUTES.insurancePolicies)}
		/>
	)
}
