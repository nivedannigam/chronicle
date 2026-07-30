import type { OcrDocumentInput } from '../types/ocr-document-input.types'
import type { OcrDocumentResult, OcrTable } from '../types/ocr-result.types'

export interface MockLabMetricRow {
	testName: string
	value: string
	referenceRange: string
	unit: string
}

export interface MockLabTemplate {
	headerLines: string[]
	metrics: MockLabMetricRow[]
}

export const MOCK_LAB_TEMPLATES: Record<string, MockLabTemplate> = {
	liver: {
		headerLines: [
			'LIVER FUNCTION TEST',
			'Laboratory: SRL Diagnostics',
			'Patient: John Doe',
			'Report Date: 08-Mar-2026',
		],
		metrics: [
			{
				testName: 'ALT (SGPT)',
				value: '28',
				referenceRange: '7-56',
				unit: 'U/L',
			},
			{
				testName: 'AST (SGOT)',
				value: '24',
				referenceRange: '10-40',
				unit: 'U/L',
			},
			{
				testName: 'Bilirubin Total',
				value: '0.8',
				referenceRange: '0.1-1.2',
				unit: 'mg/dL',
			},
			{
				testName: 'Albumin',
				value: '4.2',
				referenceRange: '3.5-5.5',
				unit: 'g/dL',
			},
		],
	},
	vitamin: {
		headerLines: [
			'VITAMIN PANEL',
			'Laboratory: Thyrocare',
			'Patient: John Doe',
			'Report Date: 12-Jun-2026',
		],
		metrics: [
			{
				testName: 'Vitamin D',
				value: '28',
				referenceRange: '30-100',
				unit: 'ng/mL',
			},
			{
				testName: 'Vitamin B12',
				value: '450',
				referenceRange: '200-900',
				unit: 'pg/mL',
			},
			{ testName: 'Folate', value: '12', referenceRange: '>3', unit: 'ng/mL' },
			{
				testName: 'Iron',
				value: '95',
				referenceRange: '60-170',
				unit: 'µg/dL',
			},
		],
	},
	cbc: {
		headerLines: [
			'COMPLETE BLOOD COUNT',
			'Laboratory: Apollo Diagnostics',
			'Reference No: CBC-2025-0610',
			'Patient: John Doe',
			'Collection Date: 09-Jun-2025',
			'Report Date: 10-Jun-2025',
		],
		metrics: [
			{
				testName: 'Hemoglobin',
				value: '14.2',
				referenceRange: '13-17',
				unit: 'g/dL',
			},
			{
				testName: 'WBC Count',
				value: '7200',
				referenceRange: '4000-11000',
				unit: '/µL',
			},
			{
				testName: 'Platelet Count',
				value: '245000',
				referenceRange: '150000-450000',
				unit: '/µL',
			},
		],
	},
	kft: {
		headerLines: [
			'KIDNEY FUNCTION TEST',
			'Laboratory: Apollo Diagnostics',
			'Reference No: KFT-2025-0818',
			'Patient: John Doe',
			'Report Date: 18-Aug-2025',
		],
		metrics: [
			{
				testName: 'Creatinine',
				value: '0.9',
				referenceRange: '0.7-1.3',
				unit: 'mg/dL',
			},
			{
				testName: 'Uric Acid',
				value: '5.2',
				referenceRange: '3.5-7.2',
				unit: 'mg/dL',
			},
			{ testName: 'eGFR', value: '98', referenceRange: '>90', unit: 'mL/min' },
		],
	},
	lipid: {
		headerLines: [
			'LIPID PROFILE',
			'Laboratory: Max Healthcare',
			'Doctor: Dr. Mehta',
			'Patient: John Doe',
			'Report Date: 20-Nov-2025',
		],
		metrics: [
			{
				testName: 'Total Cholesterol',
				value: '195',
				referenceRange: '<200',
				unit: 'mg/dL',
			},
			{
				testName: 'LDL Cholesterol',
				value: '118',
				referenceRange: '<100',
				unit: 'mg/dL',
			},
			{
				testName: 'HDL Cholesterol',
				value: '52',
				referenceRange: '>40',
				unit: 'mg/dL',
			},
			{
				testName: 'Triglycerides',
				value: '140',
				referenceRange: '<150',
				unit: 'mg/dL',
			},
		],
	},
	thyroid: {
		headerLines: [
			'THYROID PROFILE',
			'Laboratory: Dr Lal PathLabs',
			'Patient: John Doe',
			'Report Date: 05-Sep-2025',
		],
		metrics: [
			{
				testName: 'TSH',
				value: '2.1',
				referenceRange: '0.4-4.0',
				unit: 'µIU/mL',
			},
			{
				testName: 'Free T4',
				value: '1.2',
				referenceRange: '0.8-1.8',
				unit: 'ng/dL',
			},
			{
				testName: 'Free T3',
				value: '3.0',
				referenceRange: '2.3-4.2',
				unit: 'pg/mL',
			},
		],
	},
	diabetes: {
		headerLines: [
			'DIABETES PANEL',
			'Laboratory: Thyrocare',
			'Patient: John Doe',
			'Report Date: 22-Jul-2025',
		],
		metrics: [
			{ testName: 'HbA1c', value: '5.4', referenceRange: '<5.7', unit: '%' },
			{
				testName: 'Fasting Glucose',
				value: '88',
				referenceRange: '70-99',
				unit: 'mg/dL',
			},
		],
	},
	general: {
		headerLines: [
			'ANNUAL HEALTH CHECKUP',
			'Laboratory: Apollo Diagnostics',
			'Patient: John Doe',
			'Report Date: 15-Jan-2026',
		],
		metrics: [
			{
				testName: 'Hemoglobin',
				value: '14.0',
				referenceRange: '13-17',
				unit: 'g/dL',
			},
			{
				testName: 'Creatinine',
				value: '0.9',
				referenceRange: '0.7-1.3',
				unit: 'mg/dL',
			},
			{
				testName: 'TSH',
				value: '2.0',
				referenceRange: '0.4-4.0',
				unit: 'µIU/mL',
			},
		],
	},
	passport: {
		headerLines: [
			'PASSPORT',
			'Republic of India',
			'Type: P',
			'Country Code: IND',
			'Passport No: Z1234567',
			'Surname: DOE',
			'Given Names: JOHN',
			'Nationality: INDIAN',
			'Date of Birth: 15/01/1990',
			'Date of Issue: 01/01/2020',
			'Date of Expiry: 01/01/2030',
			'P<INDDOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<',
			'Z1234567<IND9001151M3001010<<<<<<<<<<<<<<0',
		],
		metrics: [],
	},
	iron: {
		headerLines: [
			'IRON STUDIES',
			'Laboratory: Apollo Diagnostics',
			'Patient: John Doe',
			'Report Date: 14-Jan-2026',
		],
		metrics: [
			{
				testName: 'Iron',
				value: '88',
				referenceRange: '60-170',
				unit: 'µg/dL',
			},
			{
				testName: 'Ferritin',
				value: '45',
				referenceRange: '15-150',
				unit: 'ng/mL',
			},
			{
				testName: 'TIBC',
				value: '320',
				referenceRange: '250-450',
				unit: 'µg/dL',
			},
		],
	},
	checkup: {
		headerLines: [
			'FULL BODY CHECKUP',
			'Laboratory: Apollo Diagnostics',
			'Patient: John Doe',
			'Report Date: 20-Mar-2024',
		],
		metrics: [
			{
				testName: 'Hemoglobin',
				value: '13.8',
				referenceRange: '13-17',
				unit: 'g/dL',
			},
			{
				testName: 'Total Cholesterol',
				value: '192',
				referenceRange: '<200',
				unit: 'mg/dL',
			},
			{
				testName: 'Vitamin D',
				value: '32',
				referenceRange: '30-100',
				unit: 'ng/mL',
			},
		],
	},
	summary: {
		headerLines: [
			'HEALTH SUMMARY REPORT',
			'Laboratory: Apollo Diagnostics',
			'Patient: John Doe',
			'Report Date: 01-Jan-2026',
		],
		metrics: [
			{
				testName: 'Hemoglobin',
				value: '14.1',
				referenceRange: '13-17',
				unit: 'g/dL',
			},
			{
				testName: 'Creatinine',
				value: '0.85',
				referenceRange: '0.7-1.3',
				unit: 'mg/dL',
			},
			{
				testName: 'TSH',
				value: '1.9',
				referenceRange: '0.4-4.0',
				unit: 'µIU/mL',
			},
		],
	},
}

export function resolveMockTemplate(fileName: string): MockLabTemplate {
	const lower = fileName.toLowerCase()

	if (lower.includes('passport')) {
		return MOCK_LAB_TEMPLATES.passport
	}

	if (lower.includes('lft') || lower.includes('liver')) {
		return MOCK_LAB_TEMPLATES.liver
	}

	if (lower.includes('vitamin')) {
		return MOCK_LAB_TEMPLATES.vitamin
	}

	if (
		lower.includes('cbc') ||
		lower.includes('blood count') ||
		lower.includes('blood test')
	) {
		return MOCK_LAB_TEMPLATES.cbc
	}

	if (lower.includes('complete blood') || lower.includes('full blood')) {
		return MOCK_LAB_TEMPLATES.cbc
	}

	if (lower.includes('iron')) {
		return MOCK_LAB_TEMPLATES.iron
	}

	if (lower.includes('health summary') || lower.includes('summary')) {
		return MOCK_LAB_TEMPLATES.summary
	}

	if (
		lower.includes('full body') ||
		lower.includes('checkup') ||
		lower.includes('partial')
	) {
		return MOCK_LAB_TEMPLATES.checkup
	}

	if (
		lower.includes('kft') ||
		lower.includes('kidney') ||
		lower.includes('renal')
	) {
		return MOCK_LAB_TEMPLATES.kft
	}

	if (lower.includes('lipid') || lower.includes('cholesterol')) {
		return MOCK_LAB_TEMPLATES.lipid
	}

	if (lower.includes('thyroid')) {
		return MOCK_LAB_TEMPLATES.thyroid
	}

	if (lower.includes('diabetes') || lower.includes('hba1c')) {
		return MOCK_LAB_TEMPLATES.diabetes
	}

	return MOCK_LAB_TEMPLATES.general
}

export function buildMockRawText(template: MockLabTemplate): string {
	const tableHeader = 'Test Name          Result    Reference Range    Unit'
	const tableRows = template.metrics.map(
		(row) =>
			`${row.testName.padEnd(19)}${row.value.padEnd(10)}${row.referenceRange.padEnd(19)}${row.unit}`,
	)

	return [...template.headerLines, '', tableHeader, ...tableRows].join('\n')
}

export function buildMockMetricsTable(template: MockLabTemplate): OcrTable {
	const headerCells = [
		{ row: 0, column: 0, text: 'Test Name' },
		{ row: 0, column: 1, text: 'Result' },
		{ row: 0, column: 2, text: 'Reference Range' },
		{ row: 0, column: 3, text: 'Unit' },
	]

	const dataCells = template.metrics.flatMap((metric, index) => {
		const row = index + 1

		return [
			{ row, column: 0, text: metric.testName, confidence: 0.96 },
			{ row, column: 1, text: metric.value, confidence: 0.98 },
			{ row, column: 2, text: metric.referenceRange, confidence: 0.95 },
			{ row, column: 3, text: metric.unit, confidence: 0.97 },
		]
	})

	return {
		pageNumber: 1,
		rows: template.metrics.length + 1,
		columns: 4,
		cells: [...headerCells, ...dataCells],
	}
}

export function buildMockOcrDocumentResult(
	document: OcrDocumentInput,
	options: { includeTables: boolean },
): OcrDocumentResult {
	const template = resolveMockTemplate(document.fileName)
	const rawText = buildMockRawText(template)
	const tables = options.includeTables ? [buildMockMetricsTable(template)] : []
	const headerText = template.headerLines.join('\n')
	const metricsText = rawText.slice(headerText.length)

	return {
		rawText,
		pages: [
			{
				pageNumber: 1,
				text: headerText,
				confidence: 0.95,
			},
			{
				pageNumber: 2,
				text: metricsText,
				confidence: 0.93,
			},
		],
		tables,
		confidence: 0.94,
		metadata: {
			provider: 'mock',
			mimeType: document.mimeType,
			fileName: document.fileName,
			language: 'en',
			pageCount: 2,
			tableCount: tables.length,
		},
		processingTimeMs: 180,
	}
}
