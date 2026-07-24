import { Calendar, HardDrive, Image, Mail, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ConnectedServiceStatus = 'connected' | 'coming_soon'

export interface ConnectedService {
	id: string
	name: string
	status: ConnectedServiceStatus
	statusLabel: string
	Icon: LucideIcon
}

export const connectedServices: ConnectedService[] = [
	{
		id: 'google-account',
		name: 'Google Account',
		status: 'connected',
		statusLabel: 'Connected',
		Icon: User,
	},
	{
		id: 'google-drive',
		name: 'Google Drive',
		status: 'coming_soon',
		statusLabel: 'Tap to connect',
		Icon: HardDrive,
	},
	{
		id: 'gmail',
		name: 'Gmail',
		status: 'coming_soon',
		statusLabel: 'Coming Soon',
		Icon: Mail,
	},
	{
		id: 'google-calendar',
		name: 'Google Calendar',
		status: 'coming_soon',
		statusLabel: 'Coming Soon',
		Icon: Calendar,
	},
	{
		id: 'google-photos',
		name: 'Google Photos',
		status: 'coming_soon',
		statusLabel: 'Coming Soon',
		Icon: Image,
	},
]
