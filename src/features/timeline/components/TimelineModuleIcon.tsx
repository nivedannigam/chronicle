import { FileInput, FileText, Heart, Sparkles } from 'lucide-react'
import type { TimelineModule } from '@/features/timeline/types/timeline.types'

interface TimelineModuleIconProps {
	module: TimelineModule
	size?: number
	color: string
}

export function TimelineModuleIcon({
	module,
	size = 17,
	color,
}: TimelineModuleIconProps) {
	switch (module) {
		case 'health':
			return <Heart size={size} color={color} />
		case 'documents':
			return <FileText size={size} color={color} />
		case 'finance':
		case 'travel':
		case 'family':
			return <Sparkles size={size} color={color} />
		case 'system':
			return <FileInput size={size} color={color} />
	}
}
