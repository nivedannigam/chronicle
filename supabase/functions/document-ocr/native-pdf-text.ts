import pdfParse from 'npm:pdf-parse@1.1.1'

const MIN_NATIVE_TEXT_LENGTH = 80
const MIN_NATIVE_WORD_COUNT = 15

export function isNativeTextSufficient(text: string): boolean {
	const trimmed = text.trim()

	if (trimmed.length < MIN_NATIVE_TEXT_LENGTH) {
		return false
	}

	const words = trimmed.split(/\s+/).filter(Boolean)

	if (words.length < MIN_NATIVE_WORD_COUNT) {
		return false
	}

	const alphanumeric = trimmed.match(/[a-zA-Z0-9]/g)?.length ?? 0

	return alphanumeric / trimmed.length >= 0.25
}

export async function extractNativePdfText(
	documentBytes: Uint8Array,
): Promise<string | null> {
	try {
		const parsed = await pdfParse(documentBytes)
		const text = (parsed.text ?? '').trim()

		if (!isNativeTextSufficient(text)) {
			return null
		}

		return text
	} catch {
		return null
	}
}
