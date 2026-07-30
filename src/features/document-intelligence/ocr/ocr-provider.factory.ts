import {
	createOCRProvider as createCoreOCRProvider,
	documentProcessingConfig,
	type OcrProviderType,
} from '@chronicle/core-ocr'
import { defaultEdgeFunctionInvoker } from '@/lib/edge-function-invoke'

export function createOCRProvider(
	providerType: OcrProviderType = documentProcessingConfig.ocrProvider,
) {
	return createCoreOCRProvider(providerType, {
		invokeEdgeFunction: defaultEdgeFunctionInvoker,
	})
}

export const defaultOCRProvider = createOCRProvider()
