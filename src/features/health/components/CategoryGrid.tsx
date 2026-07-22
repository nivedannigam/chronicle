import {
	Activity,
	Droplet,
	FlaskConical,
	Heart,
	Pill,
	Stethoscope,
	Syringe,
	Zap,
} from 'lucide-react'
import { C } from '@/constants/colors'
import type { HealthCategory, HealthCategoryId } from '@/features/health/types'
import type { LucideIcon } from 'lucide-react'

const CATEGORY_ICONS: Record<HealthCategoryId, LucideIcon> = {
	heart: Heart,
	liver: Activity,
	kidney: Droplet,
	diabetes: Syringe,
	thyroid: Zap,
	vitamin: Pill,
	'blood-count': FlaskConical,
	general: Stethoscope,
}

interface CategoryCardProps {
	category: HealthCategory
}

export function CategoryCard({ category }: CategoryCardProps) {
	const Icon = CATEGORY_ICONS[category.id]

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				padding: '16px 12px',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 10,
				minHeight: 96,
			}}
		>
			<div
				style={{
					width: 42,
					height: 42,
					borderRadius: 14,
					background: `${category.color}18`,
					border: `1px solid ${category.color}25`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<Icon size={22} color={category.color} strokeWidth={1.7} />
			</div>
			<span
				style={{
					fontSize: 13,
					fontWeight: 600,
					color: C.textSec,
					textAlign: 'center',
				}}
			>
				{category.name}
			</span>
		</div>
	)
}

interface CategoryGridProps {
	categories: HealthCategory[]
}

export function CategoryGrid({ categories }: CategoryGridProps) {
	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: '1fr 1fr 1fr 1fr',
				gap: 10,
				marginBottom: 26,
			}}
		>
			{categories.map((category) => (
				<CategoryCard key={category.id} category={category} />
			))}
		</div>
	)
}
