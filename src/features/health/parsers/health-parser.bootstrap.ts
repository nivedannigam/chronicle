import { defaultParserRegistry } from '@chronicle/core-parser'
import { healthReportParser } from '@/features/health/parsers/health.parser'

let registered = false

export function registerHealthParsers(registry = defaultParserRegistry): void {
	if (registered) {
		return
	}

	registry.register({ parser: healthReportParser })
	registered = true
}

export function ensureHealthParsersRegistered(): void {
	registerHealthParsers()
}
