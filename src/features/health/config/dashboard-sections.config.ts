export interface DashboardMetricSlot {
	id: string
	label: string
}

export interface DashboardSectionConfig {
	id: string
	title: string
	emoji: string
	metricIds: string[]
	emptyMessage: string
}

export const DASHBOARD_SECTIONS: DashboardSectionConfig[] = [
	{
		id: 'vitals',
		title: 'Vitals',
		emoji: '💓',
		metricIds: [
			'height',
			'weight',
			'bmi',
			'systolic-bp',
			'diastolic-bp',
			'pulse',
		],
		emptyMessage: 'No vitals recorded yet. Import a health checkup report.',
	},
	{
		id: 'blood-sugar',
		title: 'Blood Sugar',
		emoji: '🩸',
		metricIds: ['hba1c', 'fasting-glucose', 'random-glucose'],
		emptyMessage:
			'No diabetes markers yet. Import a blood sugar or HbA1c report.',
	},
	{
		id: 'liver',
		title: 'Liver',
		emoji: '🫀',
		metricIds: ['ast', 'alt', 'ggt', 'bilirubin'],
		emptyMessage: 'No liver reports imported yet.',
	},
	{
		id: 'kidney',
		title: 'Kidney',
		emoji: '🧪',
		metricIds: ['creatinine', 'urea', 'egfr'],
		emptyMessage: 'No kidney function data yet.',
	},
	{
		id: 'lipids',
		title: 'Lipids',
		emoji: '❤️',
		metricIds: ['total-cholesterol', 'hdl', 'ldl', 'triglycerides'],
		emptyMessage: 'No lipid panel data yet.',
	},
	{
		id: 'thyroid',
		title: 'Thyroid',
		emoji: '🦋',
		metricIds: ['tsh', 't3', 't4'],
		emptyMessage: 'No thyroid reports imported yet.',
	},
	{
		id: 'vitamins',
		title: 'Vitamins',
		emoji: '🦴',
		metricIds: ['vitamin-d', 'vitamin-b12', 'iron', 'ferritin'],
		emptyMessage: 'No vitamin or iron data yet.',
	},
	{
		id: 'inflammation',
		title: 'Inflammation',
		emoji: '🔥',
		metricIds: ['esr', 'crp'],
		emptyMessage: 'No inflammation markers yet.',
	},
]
