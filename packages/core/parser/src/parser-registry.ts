import type {
	DocumentParser,
	DocumentParserRegistration,
	DocumentTypeId,
	ParserInput,
} from './parser.types.ts'

export class ParserRegistry {
	private readonly parsers = new Map<string, DocumentParser>()

	register<TPayload>(registration: DocumentParserRegistration<TPayload>): void {
		this.parsers.set(registration.parser.id, registration.parser)
	}

	get(id: string): DocumentParser | undefined {
		return this.parsers.get(id)
	}

	getAll(): DocumentParser[] {
		return [...this.parsers.values()]
	}

	getByDocumentType(documentType: DocumentTypeId): DocumentParser[] {
		return this.getAll().filter(
			(parser) => parser.documentType === documentType,
		)
	}
}

export const defaultParserRegistry = new ParserRegistry()

export async function selectParser(
	input: ParserInput,
	registry: ParserRegistry = defaultParserRegistry,
): Promise<DocumentParser | null> {
	const candidates = registry
		.getAll()
		.filter((parser) => parser.documentType !== 'unknown')

	for (const parser of candidates) {
		if (await parser.canParse(input)) {
			return parser
		}
	}

	return null
}

export async function parseDocument<TPayload = unknown>(
	input: ParserInput,
	registry: ParserRegistry = defaultParserRegistry,
): Promise<import('./parser.types.ts').ParsedDocument<TPayload>> {
	const parser = await selectParser(input, registry)

	if (!parser) {
		throw new Error(`No parser registered for document: ${input.fileName}`)
	}

	return parser.parse(input) as Promise<
		import('./parser.types.ts').ParsedDocument<TPayload>
	>
}
