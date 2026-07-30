import { defaultParserRegistry } from '@chronicle/core-parser'
import { passportParser } from '@/features/documents/parsers/passport.parser'

let registered = false

/** Register documents-domain parsers (passport first for routing priority). */
export function registerDocumentsParsers(
	registry = defaultParserRegistry,
): void {
	if (registered) {
		return
	}

	registry.register({ parser: passportParser })
	registered = true
}

export function ensureDocumentsParsersRegistered(): void {
	registerDocumentsParsers()
}
