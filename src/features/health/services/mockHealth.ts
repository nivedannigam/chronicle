import { C } from '@/constants/colors'
import type {
	HealthDashboard,
	HealthInsight,
	HealthReport,
	HealthSnapshot,
	HealthUploadTimelineItem,
	ReportComparison,
	TrendSeries,
	UpcomingAction,
} from '@/features/health/types'

export const healthDashboard: HealthDashboard = {
	score: 84,
	latestReportId: 'report-vitamin-2026-06',
	lastCheckupDate: '2026-01-15',
	lastCheckupLabel: 'Jan 15, 2026',
	overallStatus: 'Good — 2 areas need attention',
	lastUpdated: 'Jun 12, 2026',
}

export const healthSnapshots: HealthSnapshot[] = [
	{
		id: 'heart',
		emoji: '❤️',
		name: 'Heart',
		status: 'Borderline LDL',
		trend: 'attention',
		latestResultDate: 'Nov 20, 2025',
		color: C.red,
	},
	{
		id: 'liver',
		emoji: '🫀',
		name: 'Liver',
		status: 'Normal',
		trend: 'improving',
		latestResultDate: 'Mar 8, 2026',
		color: C.orange,
	},
	{
		id: 'blood',
		emoji: '🩸',
		name: 'Blood',
		status: 'Normal',
		trend: 'stable',
		latestResultDate: 'Jun 10, 2025',
		color: C.photos,
	},
	{
		id: 'diabetes',
		emoji: '💉',
		name: 'Diabetes',
		status: 'Stable',
		trend: 'stable',
		latestResultDate: 'Jul 22, 2025',
		color: C.yellow,
	},
	{
		id: 'vitamins',
		emoji: '🦴',
		name: 'Vitamins',
		status: 'Vitamin D Low',
		trend: 'declining',
		latestResultDate: 'Jun 12, 2026',
		color: C.greenAlt,
	},
	{
		id: 'kidney',
		emoji: '🧪',
		name: 'Kidney',
		status: 'Excellent',
		trend: 'improving',
		latestResultDate: 'Aug 18, 2025',
		color: C.teal,
	},
	{
		id: 'thyroid',
		emoji: '🦋',
		name: 'Thyroid',
		status: 'Normal',
		trend: 'stable',
		latestResultDate: 'Sep 5, 2025',
		color: C.accentBlue,
	},
]

export const healthInsights: HealthInsight[] = [
	{
		id: 'insight-liver',
		text: 'Liver enzymes improved since January.',
		tone: 'positive',
	},
	{
		id: 'insight-vitamin-d',
		text: 'Vitamin D remains below normal.',
		tone: 'warning',
	},
	{
		id: 'insight-glucose',
		text: 'Blood sugar has remained stable.',
		tone: 'neutral',
	},
	{
		id: 'insight-kidney',
		text: 'Kidney function is excellent.',
		tone: 'positive',
	},
]

export const upcomingActions: UpcomingAction[] = [
	{
		id: 'action-checkup',
		title: 'Schedule Annual Checkup',
		dueLabel: 'Due in 7 months',
	},
	{
		id: 'action-vitamin-d',
		title: 'Repeat Vitamin D Test',
		dueLabel: 'Recommended in 8 weeks',
	},
	{
		id: 'action-liver',
		title: 'Book Liver Function Test',
		dueLabel: 'Follow-up in 3 months',
	},
]

export const healthUploadTimeline: HealthUploadTimelineItem[] = [
	{
		id: 'upload-1',
		fileName: 'Vitamin_Panel_Jun2026.pdf',
		displayDate: 'Jun 12, 2026',
		status: 'completed',
		reportId: 'report-vitamin-2026-06',
	},
	{
		id: 'upload-2',
		fileName: 'LFT_Report_Mar2026.pdf',
		displayDate: 'Mar 8, 2026',
		status: 'completed',
		reportId: 'report-liver-2026-03',
	},
	{
		id: 'upload-3',
		fileName: 'Annual_Checkup_Jan2026.pdf',
		displayDate: 'Jan 15, 2026',
		status: 'completed',
		reportId: 'report-general-2026-01',
	},
	{
		id: 'upload-4',
		fileName: 'Cardiac_Panel_Nov2025.pdf',
		displayDate: 'Nov 20, 2025',
		status: 'completed',
		reportId: 'report-heart-2025-11',
	},
	{
		id: 'upload-5',
		fileName: 'Thyroid_Profile_Sep2025.pdf',
		displayDate: 'Sep 5, 2025',
		status: 'processing',
	},
	{
		id: 'upload-6',
		fileName: 'Kidney_Panel_Aug2025.pdf',
		displayDate: 'Aug 18, 2025',
		status: 'uploaded',
	},
]

export const trendSeries: TrendSeries[] = [
	{
		id: 'vitamin-d',
		name: 'Vitamin D',
		unit: 'ng/mL',
		color: C.greenAlt,
		values: [
			{ date: '2025-01-15', label: 'Jan', value: 22 },
			{ date: '2025-06-10', label: 'Jun', value: 24 },
			{ date: '2025-11-20', label: 'Nov', value: 26 },
			{ date: '2026-03-08', label: 'Mar', value: 27 },
			{ date: '2026-06-12', label: 'Jun', value: 28 },
		],
	},
	{
		id: 'b12',
		name: 'B12',
		unit: 'pg/mL',
		color: C.accent,
		values: [
			{ date: '2025-01-15', label: 'Jan', value: 380 },
			{ date: '2025-06-10', label: 'Jun', value: 410 },
			{ date: '2025-11-20', label: 'Nov', value: 430 },
			{ date: '2026-03-08', label: 'Mar', value: 440 },
			{ date: '2026-06-12', label: 'Jun', value: 450 },
		],
	},
	{
		id: 'hba1c',
		name: 'HbA1c',
		unit: '%',
		color: C.yellow,
		values: [
			{ date: '2025-01-15', label: 'Jan', value: 5.6 },
			{ date: '2025-06-10', label: 'Jun', value: 5.5 },
			{ date: '2025-07-22', label: 'Jul', value: 5.4 },
			{ date: '2026-01-15', label: 'Jan', value: 5.4 },
			{ date: '2026-06-12', label: 'Jun', value: 5.3 },
		],
	},
	{
		id: 'cholesterol',
		name: 'Cholesterol',
		unit: 'mg/dL',
		color: C.red,
		values: [
			{ date: '2025-01-15', label: 'Jan', value: 210 },
			{ date: '2025-06-10', label: 'Jun', value: 205 },
			{ date: '2025-11-20', label: 'Nov', value: 195 },
			{ date: '2026-03-08', label: 'Mar', value: 192 },
			{ date: '2026-06-12', label: 'Jun', value: 188 },
		],
	},
	{
		id: 'weight',
		name: 'Weight',
		unit: 'kg',
		color: C.teal,
		values: [
			{ date: '2025-01-15', label: 'Jan', value: 74.2 },
			{ date: '2025-06-10', label: 'Jun', value: 73.8 },
			{ date: '2025-11-20', label: 'Nov', value: 73.1 },
			{ date: '2026-01-15', label: 'Jan', value: 72.8 },
			{ date: '2026-06-12', label: 'Jun', value: 72.4 },
		],
	},
	{
		id: 'blood-pressure',
		name: 'Blood Pressure',
		unit: 'mmHg',
		color: C.accentBlue,
		values: [
			{ date: '2025-01-15', label: 'Jan', value: 122 },
			{ date: '2025-06-10', label: 'Jun', value: 120 },
			{ date: '2025-11-20', label: 'Nov', value: 119 },
			{ date: '2026-01-15', label: 'Jan', value: 118 },
			{ date: '2026-06-12', label: 'Jun', value: 116 },
		],
	},
]

export const reportComparisons: ReportComparison[] = [
	{
		id: 'compare-liver',
		label: 'Liver Function',
		olderReportId: 'report-general-2026-01',
		newerReportId: 'report-liver-2026-03',
		olderLabel: 'Jan 2026 Checkup',
		newerLabel: 'Mar 2026 LFT',
		metrics: [
			{
				metric: 'ALT (SGPT)',
				oldValue: '34 U/L',
				newValue: '28 U/L',
				difference: '-6',
				status: 'normal',
			},
			{
				metric: 'AST (SGOT)',
				oldValue: '30 U/L',
				newValue: '24 U/L',
				difference: '-6',
				status: 'normal',
			},
			{
				metric: 'Bilirubin',
				oldValue: '1.0 mg/dL',
				newValue: '0.8 mg/dL',
				difference: '-0.2',
				status: 'normal',
			},
		],
	},
	{
		id: 'compare-vitamin',
		label: 'Vitamins',
		olderReportId: 'report-general-2026-01',
		newerReportId: 'report-vitamin-2026-06',
		olderLabel: 'Jan 2026 Checkup',
		newerLabel: 'Jun 2026 Panel',
		metrics: [
			{
				metric: 'Vitamin D',
				oldValue: '24 ng/mL',
				newValue: '28 ng/mL',
				difference: '+4',
				status: 'low',
			},
			{
				metric: 'Vitamin B12',
				oldValue: '420 pg/mL',
				newValue: '450 pg/mL',
				difference: '+30',
				status: 'normal',
			},
			{
				metric: 'Iron',
				oldValue: '88 µg/dL',
				newValue: '95 µg/dL',
				difference: '+7',
				status: 'normal',
			},
		],
	},
]

export const healthReports: HealthReport[] = [
	{
		id: 'report-general-2026-01',
		date: '2026-01-15',
		displayDate: 'Jan 2026',
		lab: 'Apollo Diagnostics',
		category: 'general',
		title: 'Annual Health Checkup',
		summary:
			'Overall health is good. Blood pressure and BMI within normal range. Follow-up recommended for Vitamin D.',
		doctorNotes:
			'Patient presents with generally good health markers. Vitamin D supplementation discussed. Continue current exercise routine.',
		recommendations: [
			'Start Vitamin D supplementation (2000 IU daily)',
			'Repeat lipid panel in 6 months',
			'Maintain current physical activity level',
		],
		metrics: [
			{
				name: 'Blood Pressure',
				value: '118/76 mmHg',
				reference: '<120/80',
				status: 'normal',
			},
			{ name: 'BMI', value: '23.4', reference: '18.5-24.9', status: 'normal' },
			{
				name: 'Resting Heart Rate',
				value: '72 bpm',
				reference: '60-100',
				status: 'normal',
			},
			{
				name: 'Fasting Glucose',
				value: '92 mg/dL',
				reference: '70-99',
				status: 'normal',
			},
			{
				name: 'Vitamin D',
				value: '24 ng/mL',
				reference: '30-100',
				status: 'low',
			},
			{
				name: 'ALT (SGPT)',
				value: '34 U/L',
				reference: '7-56',
				status: 'normal',
			},
		],
	},
	{
		id: 'report-liver-2026-03',
		date: '2026-03-08',
		displayDate: 'Mar 2026',
		lab: 'SRL Diagnostics',
		category: 'liver',
		title: 'LFT Report',
		summary:
			'Liver function tests are within normal limits. No signs of hepatic stress.',
		doctorNotes:
			'Liver enzymes show improvement compared to January baseline. No further intervention required at this time.',
		recommendations: [
			'Continue moderate alcohol consumption limits',
			'Repeat LFT in 6 months',
		],
		metrics: [
			{
				name: 'ALT (SGPT)',
				value: '28 U/L',
				reference: '7-56',
				status: 'normal',
			},
			{
				name: 'AST (SGOT)',
				value: '24 U/L',
				reference: '10-40',
				status: 'normal',
			},
			{
				name: 'Bilirubin Total',
				value: '0.8 mg/dL',
				reference: '0.1-1.2',
				status: 'normal',
			},
			{
				name: 'Albumin',
				value: '4.2 g/dL',
				reference: '3.5-5.5',
				status: 'normal',
			},
		],
	},
	{
		id: 'report-vitamin-2026-06',
		date: '2026-06-12',
		displayDate: 'Jun 2026',
		lab: 'Thyrocare',
		category: 'vitamin',
		title: 'Vitamin Report',
		summary:
			'Vitamin D is slightly below optimal range. B12 and folate are within normal limits.',
		doctorNotes:
			'Vitamin D trending upward but still suboptimal. Increase supplementation dose and retest in 8 weeks.',
		recommendations: [
			'Increase Vitamin D to 4000 IU daily',
			'Repeat Vitamin D test in 8 weeks',
			'Include more outdoor activity for natural synthesis',
		],
		metrics: [
			{
				name: 'Vitamin D',
				value: '28 ng/mL',
				reference: '30-100',
				status: 'low',
			},
			{
				name: 'Vitamin B12',
				value: '450 pg/mL',
				reference: '200-900',
				status: 'normal',
			},
			{ name: 'Folate', value: '12 ng/mL', reference: '>3', status: 'normal' },
			{
				name: 'Iron',
				value: '95 µg/dL',
				reference: '60-170',
				status: 'normal',
			},
		],
	},
	{
		id: 'report-heart-2025-11',
		date: '2025-11-20',
		displayDate: 'Nov 2025',
		lab: 'Max Healthcare',
		category: 'heart',
		title: 'Cardiac Panel',
		summary:
			'Lipid profile shows mildly elevated LDL. HDL and triglycerides are acceptable.',
		doctorNotes:
			'LDL slightly above target. Dietary modifications recommended before considering medication.',
		recommendations: [
			'Reduce saturated fat intake',
			'Add 30 min cardio 4x per week',
			'Recheck lipid panel in 3 months',
		],
		metrics: [
			{
				name: 'Total Cholesterol',
				value: '195 mg/dL',
				reference: '<200',
				status: 'normal',
			},
			{
				name: 'LDL Cholesterol',
				value: '118 mg/dL',
				reference: '<100',
				status: 'high',
			},
			{
				name: 'HDL Cholesterol',
				value: '52 mg/dL',
				reference: '>40',
				status: 'normal',
			},
			{
				name: 'Triglycerides',
				value: '140 mg/dL',
				reference: '<150',
				status: 'normal',
			},
		],
	},
	{
		id: 'report-thyroid-2025-09',
		date: '2025-09-05',
		displayDate: 'Sep 2025',
		lab: 'Dr Lal PathLabs',
		category: 'thyroid',
		title: 'Thyroid Profile',
		summary:
			'Thyroid function is normal. TSH and free T4 within reference range.',
		doctorNotes: 'Thyroid function stable. No medication indicated.',
		recommendations: ['Annual thyroid screening sufficient'],
		metrics: [
			{
				name: 'TSH',
				value: '2.1 µIU/mL',
				reference: '0.4-4.0',
				status: 'normal',
			},
			{
				name: 'Free T4',
				value: '1.2 ng/dL',
				reference: '0.8-1.8',
				status: 'normal',
			},
			{
				name: 'Free T3',
				value: '3.0 pg/mL',
				reference: '2.3-4.2',
				status: 'normal',
			},
		],
	},
	{
		id: 'report-kidney-2025-08',
		date: '2025-08-18',
		displayDate: 'Aug 2025',
		lab: 'Apollo Diagnostics',
		category: 'kidney',
		title: 'Kidney Function Test',
		summary:
			'Kidney function is normal. Creatinine and eGFR within healthy range.',
		doctorNotes: 'Excellent kidney function. No concerns noted.',
		recommendations: ['Maintain hydration', 'Annual kidney panel recommended'],
		metrics: [
			{
				name: 'Creatinine',
				value: '0.9 mg/dL',
				reference: '0.7-1.3',
				status: 'normal',
			},
			{
				name: 'Blood Urea',
				value: '18 mg/dL',
				reference: '7-20',
				status: 'normal',
			},
			{ name: 'eGFR', value: '98 mL/min', reference: '>90', status: 'normal' },
		],
	},
	{
		id: 'report-diabetes-2025-07',
		date: '2025-07-22',
		displayDate: 'Jul 2025',
		lab: 'Thyrocare',
		category: 'diabetes',
		title: 'HbA1c Test',
		summary: 'Blood sugar control is good. HbA1c indicates non-diabetic range.',
		doctorNotes: 'Glucose metabolism stable over past quarter.',
		recommendations: ['Continue balanced diet', 'HbA1c recheck in 6 months'],
		metrics: [
			{ name: 'HbA1c', value: '5.4%', reference: '<5.7', status: 'normal' },
			{
				name: 'Fasting Glucose',
				value: '88 mg/dL',
				reference: '70-99',
				status: 'normal',
			},
			{
				name: 'Post-Prandial Glucose',
				value: '118 mg/dL',
				reference: '<140',
				status: 'normal',
			},
		],
	},
	{
		id: 'report-blood-2025-06',
		date: '2025-06-10',
		displayDate: 'Jun 2025',
		lab: 'SRL Diagnostics',
		category: 'blood-count',
		title: 'Complete Blood Count',
		summary:
			'All blood count parameters are within normal range. No anemia detected.',
		doctorNotes: 'Healthy blood profile. No iron deficiency indicators.',
		recommendations: ['Routine CBC annually'],
		metrics: [
			{
				name: 'Hemoglobin',
				value: '14.2 g/dL',
				reference: '13-17',
				status: 'normal',
			},
			{
				name: 'WBC Count',
				value: '7,200 /µL',
				reference: '4,000-11,000',
				status: 'normal',
			},
			{
				name: 'Platelet Count',
				value: '245,000 /µL',
				reference: '150,000-450,000',
				status: 'normal',
			},
			{
				name: 'RBC Count',
				value: '4.8 M/µL',
				reference: '4.5-5.5',
				status: 'normal',
			},
		],
	},
	{
		id: 'report-liver-2025-01',
		date: '2025-01-10',
		displayDate: 'Jan 2025',
		lab: 'Apollo Diagnostics',
		category: 'liver',
		title: 'LFT Report',
		summary: 'Mildly elevated ALT noted. Recommended lifestyle review.',
		doctorNotes:
			'Baseline liver panel with slightly elevated ALT. Follow-up advised.',
		recommendations: ['Reduce alcohol intake', 'Repeat LFT in 3 months'],
		metrics: [
			{
				name: 'ALT (SGPT)',
				value: '42 U/L',
				reference: '7-56',
				status: 'normal',
			},
			{
				name: 'AST (SGOT)',
				value: '36 U/L',
				reference: '10-40',
				status: 'normal',
			},
			{
				name: 'Bilirubin Total',
				value: '1.1 mg/dL',
				reference: '0.1-1.2',
				status: 'normal',
			},
		],
	},
	{
		id: 'report-vitamin-2025-06',
		date: '2025-06-10',
		displayDate: 'Jun 2025',
		lab: 'Thyrocare',
		category: 'vitamin',
		title: 'Vitamin Panel',
		summary: 'Vitamin D below optimal. Other vitamins within range.',
		doctorNotes: 'Initiated Vitamin D supplementation protocol.',
		recommendations: ['Begin Vitamin D 2000 IU daily'],
		metrics: [
			{
				name: 'Vitamin D',
				value: '24 ng/mL',
				reference: '30-100',
				status: 'low',
			},
			{
				name: 'Vitamin B12',
				value: '420 pg/mL',
				reference: '200-900',
				status: 'normal',
			},
		],
	},
]
