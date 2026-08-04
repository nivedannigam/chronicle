/** Ask Chronicle premium design language */
export const AskColors = {
	primary: '#3B82F6',
	primaryMuted: 'rgba(59, 130, 246, 0.12)',
	positive: '#10B981',
	positiveMuted: 'rgba(16, 185, 129, 0.12)',
	attention: '#F59E0B',
	attentionMuted: 'rgba(245, 158, 11, 0.12)',
	critical: '#EF4444',
	criticalMuted: 'rgba(239, 68, 68, 0.12)',
	neutral: '#94A3B8',
	slate: '#64748B',
	bg: '#111116',
	card: '#18181F',
	cardElevated: '#1E1E26',
	line: 'rgba(255,255,255,0.07)',
	fg: '#F8FAFC',
	mid: 'rgba(248,250,252,0.72)',
	dim: 'rgba(248,250,252,0.42)',
	aiGradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
} as const

export const AskTypography = {
	question: {
		fontSize: 15,
		fontWeight: 600,
		lineHeight: 1.45,
	},
	answer: {
		fontSize: 17,
		fontWeight: 500,
		lineHeight: 1.7,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: 600,
		lineHeight: 1.4,
		letterSpacing: '0.02em',
	},
	body: {
		fontSize: 15,
		fontWeight: 400,
		lineHeight: 1.65,
	},
} as const

export const AskLayout = {
	cardRadius: 24,
	sectionRadius: 16,
	maxContentWidth: 680,
} as const
