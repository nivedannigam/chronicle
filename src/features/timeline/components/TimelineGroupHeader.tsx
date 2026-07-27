import { FigmaSectionLabel } from '@/ui/figma/components/primitives'

interface TimelineGroupHeaderProps {
	label: string
}

export function TimelineGroupHeader({ label }: TimelineGroupHeaderProps) {
	return <FigmaSectionLabel>{label}</FigmaSectionLabel>
}
