import type { ChroniclePlatformModule } from '@/core/platform/contracts/platform-module.contract'

const modules = new Map<string, ChroniclePlatformModule>()

export function registerPlatformModule(module: ChroniclePlatformModule): void {
	modules.set(module.id, module)
}

export function unregisterPlatformModule(moduleId: string): void {
	modules.delete(moduleId)
}

export function clearPlatformModules(): void {
	modules.clear()
}

export function getPlatformModule(
	moduleId: string,
): ChroniclePlatformModule | undefined {
	return modules.get(moduleId)
}

export function getRegisteredPlatformModules(): ChroniclePlatformModule[] {
	return [...modules.values()].sort((left, right) =>
		left.label.localeCompare(right.label),
	)
}

export function getEnabledPlatformModules(): ChroniclePlatformModule[] {
	return getRegisteredPlatformModules().filter((module) => module.enabled)
}

export function getRegisteredPlatformModuleIds(): string[] {
	return [...modules.keys()]
}
