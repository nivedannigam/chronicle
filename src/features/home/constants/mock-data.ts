import { DollarSign, FileText, Image, Mail, Plane } from 'lucide-react'
import { C } from '@/constants/colors'
import type { IntelligenceItem, WorldCardData } from '@/types'

export const HOME_GREETING = {
	date: 'Sunday, July 20',
	line1: 'Good morning,',
	line2: 'Nivedan.',
} as const

export const intelligenceBrief: IntelligenceItem[] = [
	{ label: 'Three emails need your reply', color: C.red, Icon: Mail },
	{
		label: 'HDFC bill due tomorrow · ₹24,800',
		color: C.orange,
		Icon: DollarSign,
	},
	{ label: 'Paris trip · Aug 14', color: C.green, Icon: Plane },
	{
		label: 'Passport expires in 8 months',
		color: C.textMuted,
		Icon: FileText,
	},
]

export const worldCards: WorldCardData[] = [
	{
		Icon: Plane,
		label: 'Travel',
		title: 'Paris',
		sub: 'Aug 14',
		color: C.orange,
	},
	{
		Icon: Mail,
		label: 'Mail',
		title: '12 New',
		sub: 'Needs reply',
		color: C.accentBlue,
	},
	{
		Icon: DollarSign,
		label: 'Finance',
		title: '₹24,800',
		sub: 'Due tomorrow',
		color: C.red,
	},
	{
		Icon: FileText,
		label: 'Docs',
		title: '3 New',
		sub: 'Added today',
		color: C.accent,
	},
	{
		Icon: Image,
		label: 'Photos',
		title: '18 New',
		sub: 'This week',
		color: C.photos,
	},
]
