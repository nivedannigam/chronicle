import { describe, expect, it } from 'vitest'
import { isNativeTextSufficient } from '@/features/document-intelligence/content/native-text-quality'

describe('native text quality', () => {
	it('accepts usable embedded PDF text', () => {
		const text =
			'Policy Number POL 123456\nInsurer ICICI Lombard\nSum Insured 2500000\n'.repeat(
				4,
			)

		expect(isNativeTextSufficient(text)).toBe(true)
	})

	it('rejects empty or scanned-placeholder text', () => {
		expect(isNativeTextSufficient('')).toBe(false)
		expect(isNativeTextSufficient('abc')).toBe(false)
		expect(isNativeTextSufficient('!!! ### $$$')).toBe(false)
	})
})
