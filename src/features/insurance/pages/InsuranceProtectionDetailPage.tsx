import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import {
	buildProtectionDetailViewModel,
	isPolicyCategoryId,
} from '@/features/insurance/services/insurance-protection.mapper'
import { InsuranceHomeSkeleton } from '@/features/insurance/components/InsuranceHomeStates'
import { FigmaInsuranceProtectionDetailView } from '@/ui/figma/insurance/FigmaInsuranceProtectionDetailView'

export function InsuranceProtectionDetailPage() {
	const { categoryId } = useParams<{ categoryId: string }>()
	const navigate = useNavigate()
	const { knowledge, isLoading, isError } = useInsuranceContext()

	const detail = useMemo(() => {
		if (!categoryId || !isPolicyCategoryId(categoryId)) {
			return null
		}

		return buildProtectionDetailViewModel({
			knowledge,
			categoryId,
		})
	}, [knowledge, categoryId])

	if (isLoading) {
		return <InsuranceHomeSkeleton />
	}

	if (isError || !detail) {
		return <Navigate to={ROUTES.insuranceCoverage} replace />
	}

	return (
		<FigmaInsuranceProtectionDetailView
			detail={detail}
			onBack={() => navigate(ROUTES.insuranceCoverage)}
		/>
	)
}
