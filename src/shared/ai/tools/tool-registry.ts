import type { ChronicleIntent } from '@/shared/ai/intent/intent.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'
import type { ChronicleTool } from '@/shared/ai/tools/tool.types'

export class ToolRegistry {
	private readonly tools = new Map<string, ChronicleTool>()

	register(tool: ChronicleTool): void {
		if (this.tools.has(tool.name)) {
			throw new Error(`Tool "${tool.name}" is already registered.`)
		}

		this.tools.set(tool.name, tool)
	}

	get(name: string): ChronicleTool | undefined {
		return this.tools.get(name)
	}

	require(name: string): ChronicleTool {
		const tool = this.get(name)

		if (!tool) {
			throw new Error(`Tool "${name}" is not registered.`)
		}

		return tool
	}

	list(domain?: KnowledgeDomainId): ChronicleTool[] {
		const all = [...this.tools.values()]
		return domain ? all.filter((tool) => tool.domain === domain) : all
	}

	getForIntent(
		intent: ChronicleIntent,
		domain: KnowledgeDomainId,
	): ChronicleTool[] {
		return this.list(domain).filter((tool) =>
			tool.supportedIntents.includes(intent),
		)
	}

	has(name: string): boolean {
		return this.tools.has(name)
	}
}

export const defaultToolRegistry = new ToolRegistry()
