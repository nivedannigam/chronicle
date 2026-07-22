import { C } from '@/constants/colors'
import type {
	HealthCategory,
	HealthDashboard,
	HealthReport,
} from '@/features/health/types'

export const healthDashboard: HealthDashboard = {
	score: 84,
	latestReportId: 'report-vitamin-2026-06',
	lastCheckupDate: '2026-01-15',
	lastCheckupLabel: 'Jan 15, 2026',
}

export const healthCategories: HealthCategory[] = [
	{ id: 'heart', name: 'Heart', color: C.red, reportCount: 2 },
	{ id: 'liver', name: 'Liver', color: C.orange, reportCount: 1 },
	{ id: 'kidney', name: 'Kidney', color: C.teal, reportCount: 1 },
	{ id: 'diabetes', name: 'Diabetes', color: C.yellow, reportCount: 1 },
	{ id: 'thyroid', name: 'Thyroid', color: C.accentBlue, reportCount: 1 },
	{ id: 'vitamin', name: 'Vitamin', color: C.greenAlt, reportCount: 1 },
	{ id: 'blood-count', name: 'Blood Count', color: C.photos, reportCount: 2 },
	{ id: 'general', name: 'General', color: C.accent, reportCount: 1 },
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
		metrics: [
			{
				name: 'Blood Pressure',
				value: '118/76 mmHg',
				reference: '<120/80',
				status: 'normal',
			},
			{
				name: 'BMI',
				value: '23.4',
				reference: '18.5-24.9',
				status: 'normal',
			},
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
			{
				name: 'Folate',
				value: '12 ng/mL',
				reference: '>3',
				status: 'normal',
			},
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
			{
				name: 'eGFR',
				value: '98 mL/min',
				reference: '>90',
				status: 'normal',
			},
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
		metrics: [
			{
				name: 'HbA1c',
				value: '5.4%',
				reference: '<5.7',
				status: 'normal',
			},
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
]
