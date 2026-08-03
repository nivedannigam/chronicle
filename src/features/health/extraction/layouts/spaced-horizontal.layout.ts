import type {
	LabLayoutExtractor,
	RawMetricRow,
} from '@/features/health/extraction/layouts/layout-extractor.types'
import {
	isNoiseLine,
	normalizeLine,
	normalizeLines,
	pushMetricRow,
} from '@/features/health/extraction/layouts/layout-extractor.utils'

const LAYOUT_ID = 'spaced-horizontal' as const

const UNIT_PATTERN =
	/^(?:mg\/dL|mg\/dl|g\/dL|gm\/dL|ug\/dl|μg\/dL|U\/L|IU\/L|mL|fL|%|Ratio|mmol\/l|pg\/mL|ng\/mL|cells\/HPF|μL|mL\/min\/1\.73 m2)$/i

const REF_PATTERN =
	/^[\d.]+\s*-\s*[\d.]+$|^[<>]\s*[\d.]+(?:\s*-\s*[\d.]+)?$|^\[\s*[\d.]+\s*-\s*[\d.]+\s*\]$/

function looksLikeMetricName(name: string): boolean {
	if (name.length < 2 || name.length > 80) {
		return false
	}

	if (
		/^(?:Test|Result|Unit|Range|Method|Specimen|Page|Report|Patient|Name|Date|Organization|Referral|Sample|Collected|Printed|Registered)/i.test(
			name,
		)
	) {
		return false
	}

	return /[A-Za-z]/.test(name)
}

function parseSpacedLine(line: string): {
	rawName: string
	value: string
	unit: string
	referenceRange: string
} | null {
	// Carcino Embryonic Antigen : 2.10 ng/mL (Document AI spacing, ref optional)
	const colonValueUnitOnly = line.match(
		/^([A-Za-z0-9 ()/.%-]{2,}?)\s*:\s*([\d.]+)\s+([A-Za-z%/μ^³.]+)\s*$/,
	)

	if (colonValueUnitOnly) {
		const [, rawName, value, unit] = colonValueUnitOnly

		if (looksLikeMetricName(rawName) && UNIT_PATTERN.test(unit)) {
			return { rawName, value, unit, referenceRange: '' }
		}
	}

	// IRON : 102.74 ug/dl 33-193
	const colonMatch = line.match(
		/^([A-Za-z0-9 ()/.%-]{2,}?)\s*:\s*([\d.]+)\s+([A-Za-z%/μ^³.]+)\s+([\d.]+\s*-\s*[\d.]+|[<>]\s*[\d.]+(?:\s*-\s*[\d.]+)?)$/,
	)

	if (colonMatch) {
		const [, rawName, value, unit, referenceRange] = colonMatch

		if (looksLikeMetricName(rawName)) {
			return { rawName, value, unit, referenceRange }
		}
	}

	// BILIRUBIN TOTAL 1.40 # mg/dl [0.30-1.20]
	const bracketMatch = line.match(
		/^([A-Za-z0-9 (),/.%-]+?)\s+([\d.]+)\s*#?\s+([A-Za-z%/μ^³.]+)\s+\[([\d.]+\s*-\s*[\d.]+|[<>]\s*[\d.]+)\]/,
	)

	if (bracketMatch) {
		const [, rawName, value, unit, referenceRange] = bracketMatch

		if (looksLikeMetricName(rawName)) {
			return { rawName, value, unit, referenceRange }
		}
	}

	// GLUCOSE, FASTING 77 mg/dL 70-100  |  SGOT 32 IU/L [15-41] without brackets handled above
	const spaceMatch = line.match(
		/^([A-Za-z0-9 (),/.%-]+?)\s+([\d.]+)\s+([A-Za-z%/μ^³.]+)\s+([\d.]+\s*-\s*[\d.]+|[<>]\s*[\d.]+)$/,
	)

	if (spaceMatch) {
		const [, rawName, value, unit, referenceRange] = spaceMatch

		if (
			looksLikeMetricName(rawName) &&
			UNIT_PATTERN.test(unit) &&
			REF_PATTERN.test(referenceRange.replace(/^\[|\]$/g, ''))
		) {
			return { rawName, value, unit, referenceRange }
		}
	}

	// SGOT 32 IU/L [15-41] — unit then bracket ref without # marker
	const bracketOnlyMatch = line.match(
		/^([A-Za-z0-9 (),/.%-]+?)\s+([\d.]+)\s+([A-Za-z%/μ^³.]+)\s+\[([\d.]+\s*-\s*[\d.]+)\]/,
	)

	if (bracketOnlyMatch) {
		const [, rawName, value, unit, referenceRange] = bracketOnlyMatch

		if (looksLikeMetricName(rawName)) {
			return { rawName, value, unit, referenceRange }
		}
	}

	return null
}

export function extractSpacedHorizontalMetrics(text: string): RawMetricRow[] {
	const rows: RawMetricRow[] = []

	for (const line of normalizeLines(text)) {
		if (!line || isNoiseLine(line)) {
			continue
		}

		const parsed = parseSpacedLine(normalizeLine(line))

		if (parsed) {
			pushMetricRow(
				rows,
				parsed.rawName,
				parsed.value,
				parsed.referenceRange,
				parsed.unit,
				LAYOUT_ID,
				0.9,
			)
		}
	}

	return rows
}

export const spacedHorizontalLayoutExtractor: LabLayoutExtractor = {
	id: LAYOUT_ID,
	priority: 80,
	extract({ rawText }) {
		return extractSpacedHorizontalMetrics(rawText)
	},
}
