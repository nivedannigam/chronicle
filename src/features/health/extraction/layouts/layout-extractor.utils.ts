import { normalizeMetricName } from '@/features/health/extraction/metric-normalization.engine'
import type {
	LabLayoutId,
	RawMetricRow,
} from '@/features/health/extraction/layouts/layout-extractor.types'

const QUALITATIVE_VALUES =
	/^(?:NEGATIVE|POSITIVE|NON\s*REACTIVE|REACTIVE|ABSENT|PRESENT|NORMAL|CLEAR|PALE YELLOW|Straw)$/i

export function normalizeLine(line: string): string {
	return line.replace(/\s+/g, ' ').trim()
}

export function normalizeLines(text: string): string[] {
	return text.replace(/\r/g, '').split('\n').map(normalizeLine)
}

export function isNoiseLine(line: string): boolean {
	if (!line || line === ':') {
		return true
	}

	return /^(?:Patient Name|Registered on|Collected on|Reported on|Printed on|Page \d|Method:|Specimen:|NOTE:|INTERPRETATION|----|End Of Report|Lab Technologist|With Regards|Investigation Result Unit Range|Test Result Unit Biological|TEST RESULT UNIT BIOLOGICAL|Test Description|TestResultUnitBiological|Organization\s*:|Referral|Patient ID|DBO\/Age|Sample ID|Report ID|----End Of Result----|\*\*\*\*End Of Result\*\*\*\*|Niranjan Nayak|Dr\.|Consultant|Reg\.No|Instrument\s*:)/i.test(
		line,
	)
}

export function pushMetricRow(
	rows: RawMetricRow[],
	rawName: string,
	value: string,
	referenceRange: string,
	unit: string | null,
	layoutId: LabLayoutId,
	confidence: number,
): void {
	const name = normalizeLine(rawName)
	const trimmedValue = normalizeLine(value)

	if (!name || !trimmedValue || QUALITATIVE_VALUES.test(name)) {
		return
	}

	if (
		/^(?:Tests Done|HDFC COMBO|COMPLETE URINE|LIPID PROFILE|Physical Examination|Chemical Examination)/i.test(
			name,
		)
	) {
		return
	}

	rows.push({
		rawName: name,
		value: trimmedValue,
		referenceRange: normalizeLine(referenceRange),
		unit: unit ? normalizeLine(unit) : null,
		confidence,
		source: 'text',
		layoutId,
	})
}

export function dedupeMetricRows(rows: RawMetricRow[]): RawMetricRow[] {
	const bestByKey = new Map<string, RawMetricRow>()

	for (const row of rows) {
		const { canonicalId } = normalizeMetricName(row.rawName)
		const key =
			canonicalId ?? normalizeMetricName(row.rawName).displayName.toLowerCase()
		const existing = bestByKey.get(key)

		if (!existing || row.confidence > existing.confidence) {
			bestByKey.set(key, row)
		}
	}

	return [...bestByKey.values()]
}
