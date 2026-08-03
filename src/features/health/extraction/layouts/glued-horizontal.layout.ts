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
	/(?:mg\/dL|mg\/dl|g\/dL|gm\/dL|ug\/dl|μg\/dL|U\/L|IU\/L|mL|fL|%|Ratio|mmol\/l|mmol\/L|pg\/mL|ng\/mL|ng\/ml|cells\/HPF|μL|mL\/min\/1\.73\s*m2)/i

function findPriorMetricName(lines: string[], index: number): string | null {
	for (let i = index - 1; i >= Math.max(0, index - 5); i -= 1) {
		const prior = normalizeLine(lines[i] ?? '')

		if (!prior || isNoiseLine(prior)) {
			continue
		}

		if (/^Method\s*:/i.test(prior)) {
			continue
		}

		if (
			/^Test Description|^INTERPRETATION|^MEAN GLUCOSE|^NOTE\s*:/i.test(prior)
		) {
			continue
		}

		if (
			/^[A-Z0-9]{2,6}$/i.test(prior) &&
			prior.length <= 6 &&
			!/\s/.test(prior)
		) {
			continue
		}

		if (looksLikeMetricName(prior)) {
			return prior
		}
	}

	return null
}

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

function parseGluedLine(
	line: string,
	lines: string[],
	index: number,
): {
	rawName: string
	value: string
	unit: string
	referenceRange: string
} | null {
	// Carcino Embryonic Antigen:2.10ng/mL (reference on following lines)
	const colonValueUnitOnly = line.match(
		/^([A-Za-z0-9 ()/.%-]{3,}?)\s*:([\d.]+)(ng\/mL|ng\/ml|mg\/dL|mg\/dl|ug\/dL|μg\/dL|U\/L|IU\/L|mmol\/l|mmol\/L)$/i,
	)

	if (colonValueUnitOnly) {
		const [, rawName, value, unit] = colonValueUnitOnly

		if (looksLikeMetricName(rawName)) {
			let referenceRange = ''
			const nextLine = normalizeLine(lines[index + 1] ?? '')
			const refMatch = nextLine.match(/[<>=]\s*[\d.]+/)

			if (refMatch) {
				referenceRange = refMatch[0].replace(/\s+/g, '')
			}

			return {
				rawName,
				value,
				unit,
				referenceRange,
			}
		}
	}

	// Document AI spacing: Carcino Embryonic Antigen : 2.10 ng/mL
	const spacedColonValueUnit = line.match(
		/^([A-Za-z0-9 ()/.%-]{3,}?)\s*:\s*([\d.]+)\s+(ng\/mL|ng\/ml|mg\/dL|mg\/dl|ug\/dL|ug\/dl|μg\/dL|U\/L|IU\/L|mmol\/l|mmol\/L)$/i,
	)

	if (spacedColonValueUnit) {
		const [, rawName, value, unit] = spacedColonValueUnit

		if (looksLikeMetricName(rawName)) {
			let referenceRange = ''
			const nextLine = normalizeLine(lines[index + 1] ?? '')
			const refMatch = nextLine.match(/[<>=]\s*[\d.]+/)

			if (refMatch) {
				referenceRange = refMatch[0].replace(/\s+/g, '')
			}

			return {
				rawName,
				value,
				unit,
				referenceRange,
			}
		}
	}

	// Blood Sugar Fasting:87.5mg/dl70-110  |  Total Iron Binding Capacity :363ug/dl255-450
	const spacedColonWithRef = line.match(
		/^([A-Za-z0-9 ()/.%-]{3,}?)\s*:\s*([\d.]+)\s+([A-Za-z%/μ^³.]+)\s+([\d.]+\s*-\s*[\d.]+|[<>]\s*[\d.]+(?:\s*-\s*[\d.]+)?)$/i,
	)

	if (spacedColonWithRef) {
		const [, rawName, value, unit, referenceRange] = spacedColonWithRef

		if (looksLikeMetricName(rawName) && GLUED_UNIT.test(unit)) {
			return {
				rawName,
				value,
				unit,
				referenceRange: referenceRange.replace(/\s+/g, ''),
			}
		}
	}
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

		const parsed = parseGluedLine(line, lines, index)

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

		// Handle multi-line Qtest: test name on prior line(s), glued value on current
		const valueOnlyMatch = line.match(
			/^([\d.]+)([A-Za-z%/μ^³.]+)([\d.]+\s*-\s*[\d.]+|[<>][\d.]+)$/i,
		)

		if (valueOnlyMatch) {
			const prior = findPriorMetricName(lines, index)

			if (prior) {
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
