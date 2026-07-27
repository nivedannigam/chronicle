/** Visual tokens from `_figma-import-new/src/app/App.tsx` */
export const FC = {
	bg: '#09090B',
	surface: '#141418',
	raise: '#1C1C22',
	blue: '#3B82F6',
	indigo: '#6366F1',
	green: '#10B981',
	amber: '#F59E0B',
	red: '#EF4444',
	purple: '#8B5CF6',
	pink: '#EC4899',
	teal: '#06B6D4',
	orange: '#F97316',
	fg: '#F8F8FA',
	mid: 'rgba(255,255,255,0.55)',
	dim: 'rgba(255,255,255,0.30)',
	ghost: 'rgba(255,255,255,0.12)',
	line: 'rgba(255,255,255,0.07)',
} as const

export const MEMBER_COLORS = [
	FC.blue,
	FC.pink,
	FC.amber,
	FC.teal,
	FC.purple,
	FC.green,
] as const

export const figmaCardStyle = {
	background: FC.surface,
	border: `1px solid ${FC.line}`,
	borderRadius: 24,
	boxShadow:
		'0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.045)',
} as const
