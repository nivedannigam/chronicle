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

const LAYOUT_ID = 'glued-horizontal' as const

const GLUED_UNIT =
	/(?:mg\/dL|mg\/dl|g\/dL|gm\/dL|ug\/dl|μg\/dL|U\/L|IU\/L|mL|fL|%|Ratio|mmol\/l|pg\/mL|ng\/mL|cells\/HPF|μL|mL\/min\/1\.73\s*m2)/i

function looksLikeMetricName(name: string): boolean {
	if (name.length < 2 || name.length > 80) {
		return false
	}

	if (
		/^(?:Test|Result|Unit|Range|Method|Specimen|Page|Report|Patient|Name|Date|Organization|Referral|Sample|Collected|Printed|Registered|Investigation|Biological)/i.test(
			name,
		)
	) {
		return false
	}

	return /[A-Za-z]{2,}/.test(name)
}

function parseGluedLine(line: string): {
	rawName: string
	value: string
	unit: string
	referenceRange: string
} | null {
	// Blood Sugar Fasting:87.5mg/dl70-110  |  Total Iron Binding Capacity :363ug/dl255-450
	const colonMatch = line.match(
		/^([A-Za-z0-9 ()/.%-]{3,}?)\s*:([\d.]+)([A-Za-z%/μ^³.]+)([\d.]+\s*-\s*[\d.]+|[<>]\s*[\d.]+)$/i,
	)

	if (colonMatch) {
		const [, rawName, value, unit, referenceRange] = colonMatch

		if (looksLikeMetricName(rawName) && GLUED_UNIT.test(unit)) {
			return {
				rawName,
				value,
				unit,
				referenceRange: referenceRange.replace(/\s+/g, ''),
			}
		}
	}

	// GLUCOSE, FASTING77mg/dL70-100 (no colon, name glued to value)
	const noColonMatch = line.match(
		/^([A-Za-z0-9 (),/.%-]{3,})([\d.]+)([A-Za-z%/μ^³.]+)([\d.]+\s*-\s*[\d.]+|[<>][\d.]+)$/i,
	)

	if (noColonMatch) {
		const [, rawName, value, unit, referenceRange] = noColonMatch

		if (looksLikeMetricName(rawName) && GLUED_UNIT.test(unit)) {
			return {
				rawName,
				value,
				unit,
				referenceRange: referenceRange.replace(/\s+/g, ''),
			}
		}
	}

	// 89mg/dL70 - 110 — value-only glued lines; use preceding context if available
	return null
}

export function extractGluedHorizontalMetrics(text: string): RawMetricRow[] {
	const rows: RawMetricRow[] = []
	const lines = normalizeLines(text)

	for (let index = 0; index < lines.length; index += 1) {
		const line = normalizeLine(lines[index])

		if (!line || isNoiseLine(line)) {
			continue
		}

		const parsed = parseGluedLine(line)

		if (parsed) {
			pushMetricRow(
				rows,
				parsed.rawName,
				parsed.value,
				parsed.referenceRange,
				parsed.unit,
				LAYOUT_ID,
				0.85,
			)
			continue
		}

		// Handle multi-line Qtest: test name on prior line, glued value on current
		const valueOnlyMatch = line.match(
			/^([\d.]+)([A-Za-z%/μ^³.]+)([\d.]+\s*-\s*[\d.]+|[<>][\d.]+)$/i,
		)

		if (valueOnlyMatch && index > 0) {
			const prior = normalizeLine(lines[index - 1])

			if (looksLikeMetricName(prior) && !isNoiseLine(prior)) {
				const [, value, unit, referenceRange] = valueOnlyMatch

				if (GLUED_UNIT.test(unit)) {
					pushMetricRow(
						rows,
						prior,
						value,
						referenceRange.replace(/\s+/g, ''),
						unit,
						LAYOUT_ID,
						0.82,
					)
				}
			}
		}
	}

	return rows
}

export const gluedHorizontalLayoutExtractor: LabLayoutExtractor = {
	id: LAYOUT_ID,
	priority: 75,
	extract({ rawText }) {
		return extractGluedHorizontalMetrics(rawText)
	},
}
