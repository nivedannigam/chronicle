import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import {
	InsuranceHomeEmptyState,
	InsuranceHomeSkeleton,
} from '@/features/insurance/components/InsuranceHomeStates'
import { FigmaInsuranceClaimDetailView } from '@/ui/figma/insurance/FigmaInsuranceClaimDetailView'

export function InsuranceClaimDetailPage() {
	const navigate = useNavigate()
	const { claimId } = useParams<{ claimId: string }>()
	const { getClaimDetail, isLoading, isError, refetch } = useInsuranceContext()

	if (isLoading) {
		return <InsuranceHomeSkeleton />
	}

	if (isError) {
		return (
			<InsuranceHomeEmptyState
				emoji="⚠️"
				title="Could not load this claim"
				body="Check your connection and try again."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (!claimId) {
		return <Navigate to={ROUTES.insuranceClaims} replace />
	}

	const detail = getClaimDetail(claimId)

	if (!detail) {
		return <Navigate to={ROUTES.insuranceClaims} replace />
	}

	return (
		<FigmaInsuranceClaimDetailView
			detail={detail}
			onBack={() => navigate(ROUTES.insuranceClaims)}
		/>
	)
}
