/**
 * Normalizes Google Document AI OCR text before layout extractors run.
 * Uses generic lab-report signals (table headers, units, metric shapes) — not vendor names.
 */

const LAB_UNIT_IN_TEXT =
	/\b(?:ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|μg\/dL|mmol\/l|mmol\/L|U\/L|IU\/L|g\/dL|gm\/dL|fL|cells\/HPF|pg\/mL|%)\b/i

const LAB_TABLE_HEADER =
	/(?:Test\s*Name|Test\s*Description|Investigation|Result|Reference\s*Range|Bio(?:logical)?\.?\s*Ref\.?\s*Interval|Biological\s*Ref|Units|METHODOLOGY|TestResultUnit|Value\s*\(\s*s\s*\))/i

/** Document AI often glues column headers without word boundaries (e.g. TestResultUnitBiological). */
const GLUED_LAB_TABLE_HEADER =
	/TestResultUnit|TestNameResult|ReferenceRange|BiologicalRef|BioRefInterval|TestResultUnitBiological/i

const GLUED_METRIC_LINE =
	/^[A-Za-z0-9 ()/.%-]{2,70}\s*:?\s*[\d.]+(?:\s*)?(?:ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|U\/L|IU\/L|mmol\/l)/im

const METRIC_SECTION_END =
	/^(?:INTERPRETATION|NOTE|METHOD|INSTRUMENT|----|End Of Report|\*\*)/i

const UNIT_TOKEN =
	/^(?:ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|μg\/dL|U\/L|IU\/L|mmol\/l|mmol\/L|g\/dL|gm\/dL|fL|cells\/HPF|pg\/mL|%|Ratio|μL|mL\/min\/1\.73\s*m2)$/i

const REF_TOKEN =
	/^[\d.]+\s*-\s*[\d.]+$|^[<>≤≥]\s*[\d.]+(?:\s*-\s*[\d.]+)?$|^\[\s*[\d.]+\s*-\s*[\d.]+\s*\]$/

const SINGLE_WORD_METRIC =
	/^(?:IRON|UIBC|FERRITIN|SODIUM|POTASSIUM|CHLORIDE|SGOT|SGPT|CREATININE|BILIRUBIN|ALBUMIN|GLOBULIN|CALCIUM|PHOSPHORUS|MAGNESIUM|URIC\s*ACID|HBA1C|TSH|T3|T4|PSA|CEA|HCG|BUN|BUN\/CREATININE|VOLUME|COLOUR|COLOR|APPEARANCE|PH|MUCUS|BACTERIA|CASTS|CRYSTALS|YEAST|NITRITE|GLUCOSE|PROTEIN|ALBUMIN)$/i

const VERTICAL_NAME_EXCLUSION =
	/^(?:ABSENT|PRESENT|NORMAL|NEGATIVE|POSITIVE|REACTIVE|NONREACTIVE|NON\s*REACTIVE|CLEAR|PALE|YELLOW|STRAW|MICROSCOPY|METHOD|PAGE|PATIENT|REPORT|NON|SMOKING|INTERPRETATION|INSTRUMENT|NOTE|SPECIMEN|REGISTERED|COLLECTED|PRINTED|REFERRAL|ORGANIZATION|LABORATORY|DOCTOR|CONSULTANT|REG\.NO|INVESTIGATION|TECHNOLOGY|UNITS|VALUE|RANGE|RESULT|DESCRIPTION|END\s+OF\s+REPORT|WITH\s+REGARDS|LAB\s+TECHNOLOGIST|TEST\s*NAME|REFERENCE\s*RANGE|BIOLOGICAL)$/i

/** Detects whether OCR text plausibly contains laboratory quantitative results. */
export function looksLikeLabReportOcr(text: string): boolean {
	const compact = text.replace(/\s+/g, '')

	return (
		LAB_TABLE_HEADER.test(text) ||
		GLUED_LAB_TABLE_HEADER.test(compact) ||
		GLUED_METRIC_LINE.test(text) ||
		hasVerticalMetricStack(text) ||
		hasDocumentAiSpacingArtifacts(text)
	)
}

function hasDocumentAiSpacingArtifacts(text: string): boolean {
	return (
		/:[ \t]+[\d.]/.test(text) ||
		/:[ \t]*[\d.]+(?:ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|U\/L|IU\/L|mmol\/l)/i.test(
			text,
		) ||
		/[\d.]+\s+(?:ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|U\/L|IU\/L|mmol\/l)/i.test(
			text,
		) ||
		/[\d.]+(?:ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|U\/L|IU\/L|mmol\/l)(?:[\d.]+|[<>])/i.test(
			text,
		) ||
		/(?:ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|U\/L|IU\/L|mmol\/l)\s+[\d.<>]/i.test(
			text,
		)
	)
}

/** Document AI often splits metric name / value / unit / ref onto separate lines. */
export function hasVerticalMetricStack(text: string): boolean {
	return (
		/^[^\d\n][^\n]{1,70}\n[\d.]+\n(?:ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|μg\/dL|U\/L|IU\/L|mmol\/l|mmol\/L|g\/dL|gm\/dL|cells\/HPF|pg\/mL|fL|%)/im.test(
			text,
		) && LAB_UNIT_IN_TEXT.test(text)
	)
}

export function normalizeDocumentAiOcrText(text: string): string {
	const normalized = text.replace(/\r/g, '')

	if (!looksLikeLabReportOcr(normalized)) {
		return normalized
	}

	return normalizeMetricSections(normalized)
}

function normalizeMetricSections(text: string): string {
	const lines = text.split('\n')
	const output: string[] = []
	let index = 0
	const compact = text.replace(/\s+/g, '')
	const documentAiLikely =
		hasDocumentAiSpacingArtifacts(text) ||
		(GLUED_LAB_TABLE_HEADER.test(compact) && hasVerticalMetricStack(text))

	while (index < lines.length) {
		const line = lines[index] ?? ''

		if (isMetricTableHeader(line)) {
			output.push(line)
			index += 1

			const sectionLines: string[] = []

			while (
				index < lines.length &&
				!METRIC_SECTION_END.test(lines[index] ?? '')
			) {
				sectionLines.push(lines[index] ?? '')
				index += 1
			}

			output.push(...normalizeSectionLines(sectionLines, documentAiLikely))
			continue
		}

		if (documentAiLikely && looksLikeVerticalStackAt(lines, index)) {
			const sectionLines: string[] = []

			while (
				index < lines.length &&
				!METRIC_SECTION_END.test(lines[index] ?? '')
			) {
				sectionLines.push(lines[index] ?? '')
				index += 1
			}

			output.push(...normalizeSectionLines(sectionLines, documentAiLikely))
			continue
		}

		output.push(line)
		index += 1
	}

	return output.join('\n')
}

function isMetricTableHeader(line: string): boolean {
	const trimmed = line.trim()

	if (!trimmed || GLUED_METRIC_LINE.test(trimmed)) {
		return false
	}

	return (
		LAB_TABLE_HEADER.test(trimmed) ||
		GLUED_LAB_TABLE_HEADER.test(trimmed.replace(/\s+/g, ''))
	)
}

function looksLikeVerticalStackAt(lines: string[], index: number): boolean {
	const name = lines[index]?.trim() ?? ''
	const second = lines[index + 1]?.trim() ?? ''
	const third = lines[index + 2]?.trim() ?? ''

	return (
		looksLikeVerticalMetricName(name) &&
		/^[\d.]+$/.test(second) &&
		UNIT_TOKEN.test(third)
	)
}

function normalizeSectionLines(
	lines: string[],
	documentAiLikely: boolean,
): string[] {
	const sectionText = lines.join('\n')

	if (
		!documentAiLikely &&
		!hasDocumentAiSpacingArtifacts(sectionText) &&
		!hasVerticalMetricStack(sectionText)
	) {
		return lines
	}

	let normalizedSection = applyDocumentAiSpacingFixes(sectionText)

	if (documentAiLikely && hasVerticalMetricStack(normalizedSection)) {
		normalizedSection = joinVerticalMetricBlocks(normalizedSection)
	}

	return normalizedSection.split('\n')
}

function applyDocumentAiSpacingFixes(text: string): string {
	return text
		.replace(/([A-Za-z)]):([\d.])/g, '$1: $2')
		.replace(
			/:\s*([\d.]+)(ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|μg\/dL|U\/L|IU\/L|mmol\/l|mmol\/L|g\/dL|gm\/dL|cells\/HPF|pg\/mL)(?!\s)/gi,
			': $1 $2',
		)
		.replace(
			/([\d.]+)(ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|μg\/dL|U\/L|IU\/L|mmol\/l|mmol\/L|g\/dL|gm\/dL|cells\/HPF|pg\/mL)(?!\s)/gi,
			'$1 $2',
		)
		.replace(
			/(ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|μg\/dL|U\/L|IU\/L|mmol\/l|mmol\/L|g\/dL|gm\/dL|cells\/HPF|pg\/mL)([\d.]+(?:\s*-\s*[\d.]+|[<>][\d.]+))/gi,
			'$1 $2',
		)
}

function looksLikeVerticalMetricName(name: string): boolean {
	const trimmed = name.trim()

	if (trimmed.length < 2 || trimmed.length > 70) {
		return false
	}

	if (VERTICAL_NAME_EXCLUSION.test(trimmed)) {
		return false
	}

	if (SINGLE_WORD_METRIC.test(trimmed)) {
		return true
	}

	if (!/\s/.test(trimmed)) {
		return false
	}

	if (!/^[A-Za-z([]/.test(trimmed) || !/[A-Za-z]{3,}/.test(trimmed)) {
		return false
	}

	if (/^(?:Dr\.|MR\.|MRS\.|MS\.|Patient|Report|Sample|Page)\b/i.test(trimmed)) {
		return false
	}

	return true
}

function joinVerticalMetricBlocks(text: string): string {
	const lines = text.split('\n')
	const output: string[] = []

	for (let index = 0; index < lines.length; index += 1) {
		const name = lines[index]?.trim() ?? ''
		const second = lines[index + 1]?.trim() ?? ''
		const third = lines[index + 2]?.trim() ?? ''
		const fourth = lines[index + 3]?.trim() ?? ''

		if (!looksLikeVerticalMetricName(name)) {
			output.push(lines[index] ?? '')
			continue
		}

		if (
			/^[\d.]+$/.test(second) &&
			UNIT_TOKEN.test(third) &&
			REF_TOKEN.test(fourth)
		) {
			output.push(`${name}:${second}${third}${fourth.replace(/\s+/g, '')}`)
			index += 3
			continue
		}

		if (/^[\d.]+$/.test(second) && UNIT_TOKEN.test(third)) {
			output.push(`${name}:${second}${third}`)
			index += 2
			continue
		}

		const valueUnitMatch = second.match(/^([\d.]+)\s+([A-Za-z%/μ^³.]+)$/)

		if (valueUnitMatch && REF_TOKEN.test(third)) {
			const [, value, unit] = valueUnitMatch
			output.push(`${name}:${value}${unit}${third.replace(/\s+/g, '')}`)
			index += 2
			continue
		}

		output.push(lines[index] ?? '')
	}

	return output.join('\n')
}
