import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function HealthImportAttentionBanner({ message }: { message: string }) {
	const navigate = useNavigate()

	return (
		<button
			type="button"
			onClick={() => navigate(ROUTES.healthImportCenter)}
			style={{
				...figmaCardStyle,
				borderRadius: 18,
				padding: '14px 16px',
				width: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 12,
				marginBottom: 22,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
				border: `1px solid ${FC.blue}25`,
				background: `${FC.blue}10`,
			}}
		>
			<span style={{ color: FC.fg, fontSize: 13.5, fontWeight: 500 }}>
				{message}
			</span>
			<ChevronRight size={16} color={FC.blue} />
		</button>
	)
}
