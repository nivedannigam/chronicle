import {
	createEdgeFunctionInvoker,
	invokeEdgeFunction as invokeWithClient,
	type EdgeFunctionInvoker,
} from '@chronicle/core-storage'
import { supabase } from '@/lib/supabase'

export {
	EdgeFunctionInvokeError,
	type EdgeFunctionInvokeDetails,
	type EdgeFunctionInvoker,
} from '@chronicle/core-storage'

export async function invokeEdgeFunction<T>(
	functionName: string,
	body: Record<string, unknown>,
): Promise<T> {
	return invokeWithClient(supabase, functionName, body)
}

export const defaultEdgeFunctionInvoker: EdgeFunctionInvoker =
	createEdgeFunctionInvoker(supabase)
