/**
 * Normalizes Google Document AI OCR text so layout extractors can parse Qtest/Svasth
 * glued and spaced metric rows reliably.
 */
export function normalizeDocumentAiOcrText(text: string): string {
	let normalized = text.replace(/\r/g, '')

	if (!shouldNormalizeDocumentAiSpacing(text)) {
		return normalized
	}

	// Document AI often inserts spaces around colons and units.
	normalized = normalized
		.replace(/([A-Za-z)]):([\d.])/g, '$1: $2')
		.replace(
			/([\d.])(ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|μg\/dL|U\/L|IU\/L)/gi,
			'$1 $2',
		)
		.replace(
			/(ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|μg\/dL|U\/L|IU\/L)([\d.<>])/gi,
			'$1 $2',
		)

	if (shouldJoinVerticalMetricBlocks(normalized)) {
		normalized = joinVerticalMetricBlocks(normalized)
	}

	return normalized
}

function shouldNormalizeDocumentAiSpacing(text: string): boolean {
	return (
		hasVerticalMetricStack(text) ||
		/\bQtest\b/i.test(text) ||
		/\bSvasth\b/i.test(text) ||
		/\bOrganization\s*:/i.test(text) ||
		/TestResultUnitBiological/i.test(text) ||
		/Carcino Embryonic Antigen/i.test(text) ||
		/REPORT ON SERUM IRON STUDIES/i.test(text)
	)
}

function hasVerticalMetricStack(text: string): boolean {
	return /^(?:IRON|UIBC|Ferritin|Carcino Embryonic Antigen)\s*\n[\d.]/m.test(
		text,
	)
}

const UNIT_TOKEN =
	/^(?:ug\/dl|ng\/mL|ng\/ml|mg\/dL|mg\/dl|μg\/dL|U\/L|IU\/L|mmol\/l|mmol\/L|g\/dL|gm\/dL|fL|%|Ratio)$/i

const REF_TOKEN = /^[\d.]+\s*-\s*[\d.]+$|^[<>]\s*[\d.]+(?:\s*-\s*[\d.]+)?$/

const SINGLE_WORD_METRICS =
	/^(?:IRON|UIBC|Ferritin|SODIUM|POTASSIUM|CHLORIDE|SGOT|SGPT|CREATININE)$/i

function shouldJoinVerticalMetricBlocks(text: string): boolean {
	return shouldNormalizeDocumentAiSpacing(text)
}

function looksLikeVerticalMetricName(name: string): boolean {
	if (SINGLE_WORD_METRICS.test(name)) {
		return true
	}

	if (name.length < 4 || name.length > 70 || !/[A-Za-z]/.test(name)) {
		return false
	}

	if (!/\s/.test(name)) {
		return false
	}

	if (
		/^(?:ABSENT|PRESENT|NORMAL|NEGATIVE|POSITIVE|Microscopy|Method|Page|Patient|Report|Non|Smoking|Interpretation|Instrument|NOTE)/i.test(
			name,
		)
	) {
		return false
	}

	return /(?:Antigen|Iron|Capacity|Saturation|Glucose|Binding|Ferritin|Bilirubin|Protein|Cholesterol|Triglyceride|Hemoglobin|Creatinine|Electrolyte|Profile|Panel|Count)/i.test(
		name,
	)
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
