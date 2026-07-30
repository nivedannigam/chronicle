import { ensureDocumentsParsersRegistered } from '@/features/documents/parsers/documents-parser.bootstrap'
import { ensureHealthParsersRegistered } from '@/features/health/parsers/health-parser.bootstrap'

let registered = false

/** Register all platform document parsers (documents before health). */
export function ensurePlatformParsersRegistered(): void {
	if (registered) {
		return
	}

	ensureDocumentsParsersRegistered()
	ensureHealthParsersRegistered()
	registered = true
}
