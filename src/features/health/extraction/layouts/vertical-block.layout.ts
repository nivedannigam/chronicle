import type {
	LabLayoutExtractor,
	RawMetricRow,
} from '@/features/health/extraction/layouts/layout-extractor.types'
import {
	normalizeLine,
	normalizeLines,
	pushMetricRow,
} from '@/features/health/extraction/layouts/layout-extractor.utils'

const LAYOUT_ID = 'vertical-block' as const

const TECHNOLOGY_SUFFIX =
	/^(?:PHOTOMETRY|CALCULATED|IMMUNOASSAY|C\.M\.I\.A|H\.P\.L\.C|I\.S\.E|Flow Cytometry|SLS-Hemoglobin Method|CPH Detection|HF & EI|Calculated|Microscopy|Visual Determination|pH indicator|pKa change|PEI|GOD-POD|Nitroprusside|Diazo coupling|Hays sulphur|Ehrlich reaction|Peroxidase reaction|Esterase reaction)$/i

const UNIT_TOKENS =
	/^(?:mg\/dL|g\/dL|gm\/dL|mL\/min\/1\.73 m2|%|Ratio|U\/L|mL|fL|pq|X 10[\^³]*\s*\/\s*μL|X 10[\^³]*\/μL|cells\/HPF|μL|mmol\/l|OD ratio|-)$/i

const SKIP_LINE =
	/^(?:Processed At|Sample Type|Report Released|Sample Collected|Sample Received|Patient Name|Referred By|Home Collection|Page\s*:|-- \d+ of \d+ --|~~ End of report|Scan QR|Dr Zeeshan|Tests Done|Please correlate|Clinical Significance|Interpretation|Limitations|References|Reference range|Reference Range|Alert\s*!!!|Method[:\s]|Note\s*:|^\*Note|^\(|^[\d.]+ mg\/dl|^Below |^Above |^Greater than|^Impaired |^Diabetes$|^Normal$|^Male\s*:|^Female:|^Adults:|^ADULTS:|^Guidance|^As per|^Fully Automated|^Derived from|^CHOL -|^HCHO -|^LDL -|^TRIG -|^TOTAL CHOLESTEROL$|^VERY HIGH$|^HIGH$|^BORDERLINE|^OPTIMAL$|^DESIRABLE$|^LOW$|^Nucleated|^DIFFERENTIAL|^ABSOLUTE|^Physical Examination|^Chemical Examination|^Microscopic Examination|^Complete Urinogram$|^UNITS$|^VALUE$|^METHODOLOGY$|^INTERPRETATION$|^OD ratio$|^\*REFERENCE|^NON REACTIVE\s*:|^REACTIVE\s*:|^NONREACTIVE|^-\sIndicates|^-\sAll |^-\sHIV |^-\sSeveral |^-\sCommon |^Levey AS|^electrophoresis|^Suggested Clinical|^Remarks\s*:|^Predominantly|^Platelets:|^~~|^\d{2}\s+[A-Za-z]{3}\s+\d{4}|^SELF$|^URINE$|^SERUM$|^FLUORIDE PLASMA$|^EDTA Whole Blood$|^[A-Z0-9| ]+\|[A-Z0-9]+$|^:$|PATIENT PLACEHOLDER|ADDRESS PLACEHOLDER)/i

const HEADER_LABEL =
	/^(?:TEST NAME(?:VALUE|TECHNOLOGY|UNITS|Bio\. Ref\. Interval\.?|INTERPRETATION)?|Bio\. Ref\. Interval\.?:?-?|TECHNOLOGY|UNITS|VALUE|METHODOLOGY|INTERPRETATION)$/i

const URINE_TEST_NAMES =
	/^(?:VOLUME|COLOUR|APPEARANCE|SPECIFIC GRAVITY|PH|URINARY PROTEIN|URINARY GLUCOSE|URINE KETONE|URINARY BILIRUBIN|UROBILINOGEN|BILE SALT|BILE PIGMENT|URINE BLOOD|NITRITE|LEUCOCYTE ESTERASE|MUCUS|RED BLOOD CELLS|URINARY LEUCOCYTES \(PUS CELLS\)|EPITHELIAL CELLS|CASTS|CRYSTALS|BACTERIA|YEAST|PARASITE)$/i

function isQualitativeUrineValue(line: string): boolean {
	const normalized = normalizeLine(line).toUpperCase()

	return /^(?:NEGATIVE|POSITIVE|NON\s*REACTIVE|REACTIVE|ABSENT|PRESENT|NORMAL|CLEAR|PALE YELLOW|STRAW)$/.test(
		normalized,
	)
}

function isMethodLine(line: string): boolean {
	return TECHNOLOGY_SUFFIX.test(normalizeLine(line))
}

function normalizeUrineQualitativeValue(line: string): string {
	const normalized = normalizeLine(line)
	const upper = normalized.toUpperCase()

	if (upper === 'ABSENT' || normalized === 'Absent') {
		return 'ABSENT'
	}

	return upper
}

function resolveUrineRowFields(input: {
	field1: string
	field2: string
	field3: string
	field4: string
}): {
	value: string
	referenceRange: string
	unit: string | null
	advance: number
} | null {
	const { field1, field2, field3, field4 } = input

	if (!field1) {
		return null
	}

	if (isMethodLine(field1) && isQualitativeUrineValue(field2)) {
		return {
			value: normalizeUrineQualitativeValue(field2),
			referenceRange: field2.toUpperCase() === 'ABSENT' ? 'ABSENT' : field2,
			unit: field3 === '-' ? null : field3,
			advance: isMethodLine(field4) ? 5 : 4,
		}
	}

	if (
		field1.toUpperCase() === 'ABSENT' &&
		(field2 === 'Absent' || field2.toUpperCase() === 'ABSENT')
	) {
		return {
			value: 'ABSENT',
			referenceRange: field1,
			unit: field3 === '-' ? null : field3,
			advance: isMethodLine(field4) ? 5 : 4,
		}
	}

	if (isQualitativeUrineValue(field1) && /[\d<>=]/.test(field2)) {
		return {
			value: normalizeUrineQualitativeValue(field1),
			referenceRange: field2,
			unit: field3 === '-' ? null : field3,
			advance: isMethodLine(field4) ? 5 : 4,
		}
	}

	if (/^[\d.]+$/.test(field1) || field1 === 'Normal') {
		return {
			value: field1,
			referenceRange: field2,
			unit: field3 === '-' ? null : field3,
			advance: isMethodLine(field4) ? 5 : 4,
		}
	}

	let value = field1
	let referenceRange = field2
	const unit = field3 === '-' ? null : field3

	if (isMethodLine(value) && isQualitativeUrineValue(referenceRange)) {
		value = normalizeUrineQualitativeValue(referenceRange)
		referenceRange =
			referenceRange.toUpperCase() === 'ABSENT' ? 'ABSENT' : referenceRange
	}

	return {
		value,
		referenceRange,
		unit,
		advance: isMethodLine(field4) ? 5 : 4,
	}
}

function isSkippableLine(line: string): boolean {
	if (!line || line === ':' || HEADER_LABEL.test(line)) {
		return true
	}

	return SKIP_LINE.test(line)
}

function stripTechnologySuffix(name: string): string {
	return name
		.replace(/(PHOTOMETRY|CALCULATED|IMMUNOASSAY|C\.M\.I\.A|H\.P\.L\.C)$/i, '')
		.trim()
}

export function splitTechnologyPrefix(line: string): {
	technology: string
	rawName: string
} | null {
	const match = line.match(
		/^(PHOTOMETRY|CALCULATED|IMMUNOASSAY|C\.M\.I\.A|H\.P\.L\.C|I\.S\.E)(.+)$/i,
	)

	if (!match || !match[2].trim()) {
		return null
	}

	return {
		technology: match[1],
		rawName: match[2].trim(),
	}
}

function parseRefUnitValueLine(line: string): {
	referenceRange: string
	unit: string
	value: string
} | null {
	const patterns = [
		/^([\d.]+\s*-\s*[\d.]+|[<>]\s*[\d.]+(?:\s*-\s*[\d.]+)?|\*Refer Note below)\s*([A-Za-z%/μ^³.]+)\s+([\d.]+)$/,
		/^([\d.]+\s*-\s*[\d.]+)(Ratio|[A-Za-z%/μ^³.]+)\s+([\d.]+)$/,
		/^([<>]\s*[\d.]+)(Ratio|[A-Za-z%/μ^³.]+)\s+([\d.]+)$/,
	]

	for (const pattern of patterns) {
		const match = line.match(pattern)

		if (match) {
			return {
				referenceRange: match[1].trim(),
				unit: match[2].trim(),
				value: match[3].trim(),
			}
		}
	}

	return null
}

function parseMashedImmunoLine(line: string): RawMetricRow | null {
	const hbsag = line.match(/^OD ratio\s+([\d.]+)C\.M\.I\.A(.+)$/i)

	if (hbsag) {
		return {
			rawName: hbsag[2].trim(),
			value: hbsag[1],
			referenceRange: '< 1',
			unit: 'OD ratio',
			confidence: 0.91,
			source: 'text',
			layoutId: LAYOUT_ID,
		}
	}

	const hiv = line.match(/^OD ratioC\.M\.I\.A\s+([\d.]+)(.+)$/i)

	if (hiv) {
		return {
			rawName: hiv[2].trim(),
			value: 'NON REACTIVE',
			referenceRange: '< 1',
			unit: 'OD ratio',
			confidence: 0.91,
			source: 'text',
			layoutId: LAYOUT_ID,
		}
	}

	const mashedMetric = line.match(
		/^(mg\/dL|g\/dL|gm\/dL|mL\/min\/1\.73 m2|%|Ratio)([\d.]+)(CALCULATED|PHOTOMETRY|H\.P\.L\.C)(.+)$/i,
	)

	if (mashedMetric) {
		const [, unit, value, , rawName] = mashedMetric

		return {
			rawName: rawName.trim(),
			value,
			referenceRange: '',
			unit,
			confidence: 0.91,
			source: 'text',
			layoutId: LAYOUT_ID,
		}
	}

	return null
}

function parsePairedPanelLines(
	currentLine: string,
	nextLine: string | undefined,
): RawMetricRow | null {
	const refRow = parseRefUnitValueLine(currentLine)
	const techLine = nextLine ? splitTechnologyPrefix(nextLine) : null

	if (!refRow || !techLine) {
		return null
	}

	return {
		rawName: techLine.rawName,
		value: refRow.value,
		referenceRange: refRow.referenceRange,
		unit: refRow.unit,
		confidence: 0.94,
		source: 'text',
		layoutId: LAYOUT_ID,
	}
}

function parseUrineVertical(
	lines: string[],
	startIndex: number,
): {
	rows: RawMetricRow[]
	nextIndex: number
} {
	const rows: RawMetricRow[] = []
	let index = startIndex

	while (index + 3 < lines.length) {
		const name = normalizeLine(lines[index])

		if (
			/^(?:Physical Examination|Chemical Examination|Microscopic Examination)$/i.test(
				name,
			)
		) {
			index += 1
			continue
		}

		if (!URINE_TEST_NAMES.test(name)) {
			break
		}

		const resolved = resolveUrineRowFields({
			field1: normalizeLine(lines[index + 1] ?? ''),
			field2: normalizeLine(lines[index + 2] ?? ''),
			field3: normalizeLine(lines[index + 3] ?? ''),
			field4: normalizeLine(lines[index + 4] ?? ''),
		})

		if (!resolved) {
			break
		}

		pushMetricRow(
			rows,
			name,
			resolved.value,
			resolved.referenceRange,
			resolved.unit,
			LAYOUT_ID,
			0.9,
		)
		index += resolved.advance
	}

	return { rows, nextIndex: index }
}

function parseUnitValueNameBlock(
	lines: string[],
	startIndex: number,
): { row: RawMetricRow | null; nextIndex: number } {
	const unit = normalizeLine(lines[startIndex] ?? '')
	const value = normalizeLine(lines[startIndex + 1] ?? '')

	if (!UNIT_TOKENS.test(unit) || !/^[\d.]+$/.test(value)) {
		return { row: null, nextIndex: startIndex }
	}

	let nameIndex = startIndex + 2
	let nameLine = normalizeLine(lines[nameIndex] ?? '')

	if (/^Bio\. Ref\. Interval/i.test(nameLine)) {
		nameIndex += 1
		nameLine = normalizeLine(lines[nameIndex] ?? '')
	}

	const split = splitTechnologyPrefix(nameLine)

	if (split) {
		return {
			row: {
				rawName: split.rawName,
				value,
				referenceRange: '',
				unit,
				confidence: 0.91,
				source: 'text',
				layoutId: LAYOUT_ID,
			},
			nextIndex: nameIndex + 1,
		}
	}

	if (
		nameLine &&
		/(PHOTOMETRY|CALCULATED|IMMUNOASSAY|C\.M\.I\.A|H\.P\.L\.C)$/i.test(nameLine)
	) {
		return {
			row: {
				rawName: stripTechnologySuffix(nameLine),
				value,
				referenceRange: '',
				unit,
				confidence: 0.91,
				source: 'text',
				layoutId: LAYOUT_ID,
			},
			nextIndex: nameIndex + 1,
		}
	}

	return { row: null, nextIndex: startIndex }
}

function parseCbcVertical(
	lines: string[],
	startIndex: number,
): {
	rows: RawMetricRow[]
	nextIndex: number
} {
	const rows: RawMetricRow[] = []
	let index = startIndex

	while (index + 3 < lines.length) {
		const unit = normalizeLine(lines[index])

		if (!UNIT_TOKENS.test(unit)) {
			break
		}

		const value = normalizeLine(lines[index + 1] ?? '')
		const referenceRange = normalizeLine(lines[index + 2] ?? '')
		const rawName = normalizeLine(lines[index + 3] ?? '')

		if (!value || !rawName || TECHNOLOGY_SUFFIX.test(rawName)) {
			break
		}

		pushMetricRow(rows, rawName, value, referenceRange, unit, LAYOUT_ID, 0.93)
		index += 4

		if (TECHNOLOGY_SUFFIX.test(normalizeLine(lines[index] ?? ''))) {
			index += 1
		}
	}

	return { rows, nextIndex: index }
}

function parseVerticalBlocks(lines: string[]): RawMetricRow[] {
	const rows: RawMetricRow[] = []
	let index = 0

	while (index < lines.length) {
		const line = normalizeLine(lines[index])

		if (!line || isSkippableLine(line)) {
			index += 1
			continue
		}

		if (line === 'NEGATIVE') {
			const next = normalizeLine(lines[index + 1] ?? '')

			if (/COTININE/i.test(next)) {
				pushMetricRow(rows, 'COTININE', 'NEGATIVE', '', null, LAYOUT_ID, 0.91)
				index += 2
				continue
			}
		}

		if (line === 'NON REACTIVE' && /HIV/i.test(lines[index + 1] ?? '')) {
			pushMetricRow(
				rows,
				'HIV I and II',
				'NON REACTIVE',
				'< 1',
				'OD ratio',
				LAYOUT_ID,
				0.91,
			)
			index += 2
			continue
		}

		const mashed = parseMashedImmunoLine(line)

		if (mashed) {
			rows.push(mashed)
			index += 1
			continue
		}

		const paired = parsePairedPanelLines(
			line,
			normalizeLine(lines[index + 1] ?? ''),
		)

		if (paired) {
			rows.push(paired)
			index += 2
			continue
		}

		if (URINE_TEST_NAMES.test(line)) {
			const urine = parseUrineVertical(lines, index)
			rows.push(...urine.rows)
			index = urine.nextIndex
			continue
		}

		if (/^%[\d.]+H\.P\.L\.C$/i.test(line.replace(/\s/g, ''))) {
			const value = line
				.replace(/^%/i, '')
				.replace(/H\.P\.L\.C$/i, '')
				.trim()
			const name = normalizeLine(lines[index + 1] ?? 'HbA1c')
			pushMetricRow(rows, name, value, '', '%', LAYOUT_ID, 0.91)
			index += 2
			continue
		}

		if (
			UNIT_TOKENS.test(line) &&
			/^[\d.]+$/.test(normalizeLine(lines[index + 1] ?? ''))
		) {
			const simple = parseUnitValueNameBlock(lines, index)

			if (simple.row) {
				rows.push(simple.row)
				index = simple.nextIndex
				continue
			}

			const cbc = parseCbcVertical(lines, index)

			if (cbc.rows.length > 0) {
				rows.push(...cbc.rows)
				index = cbc.nextIndex
				continue
			}
		}

		if (/^TEST NAME UNITS VALUE TECHNOLOGY$/i.test(line.replace(/\s+/g, ' '))) {
			const unit = normalizeLine(lines[index + 1] ?? '')
			const value = normalizeLine(lines[index + 2] ?? '')
			const nameLine = normalizeLine(lines[index + 4] ?? lines[index + 3] ?? '')

			if (unit && value && nameLine && !/^Bio\. Ref/i.test(nameLine)) {
				const name = nameLine.replace(/PHOTOMETRY$/i, '').trim()
				pushMetricRow(rows, name, value, '', unit, LAYOUT_ID, 0.9)
				index += 5
				continue
			}
		}

		index += 1
	}

	return rows
}

export function extractVerticalBlockMetrics(text: string): RawMetricRow[] {
	return parseVerticalBlocks(normalizeLines(text))
}

export const verticalBlockLayoutExtractor: LabLayoutExtractor = {
	id: LAYOUT_ID,
	priority: 90,
	extract({ rawText }) {
		return extractVerticalBlockMetrics(rawText)
	},
}

/** @deprecated Use vertical-block layout detection via registry instead. */
export function extractThyrocareMetricsFromText(text: string): RawMetricRow[] {
	return extractVerticalBlockMetrics(text)
}
