import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

export async function countPdfPages(pdfBytes: Uint8Array): Promise<number> {
	const document = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })

	return document.getPageCount()
}

export async function extractPdfPageRange(
	pdfBytes: Uint8Array,
	startPage: number,
	endPage: number,
): Promise<Uint8Array> {
	if (startPage < 1 || endPage < startPage) {
		throw new Error(
			`Invalid PDF page range: ${startPage}-${endPage}. Pages are 1-based.`,
		)
	}

	const sourceDocument = await PDFDocument.load(pdfBytes, {
		ignoreEncryption: true,
	})
	const totalPages = sourceDocument.getPageCount()

	if (endPage > totalPages) {
		throw new Error(
			`PDF page range ${startPage}-${endPage} exceeds document length (${totalPages}).`,
		)
	}

	const targetDocument = await PDFDocument.create()
	const pageIndexes = Array.from(
		{ length: endPage - startPage + 1 },
		(_, index) => startPage - 1 + index,
	)
	const copiedPages = await targetDocument.copyPages(
		sourceDocument,
		pageIndexes,
	)

	for (const page of copiedPages) {
		targetDocument.addPage(page)
	}

	return new Uint8Array(await targetDocument.save())
}
