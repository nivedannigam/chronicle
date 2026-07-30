export type {
	DocumentParser,
	DocumentParserRegistration,
	DocumentTypeId,
	ParsedDocument,
	ParserInput,
} from './parser.types.ts'
export {
	defaultParserRegistry,
	parseDocument,
	ParserRegistry,
	selectParser,
} from './parser-registry.ts'
export {
	detectDocumentType,
	documentTypeLabel,
} from './document-type.detector.ts'
