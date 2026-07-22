import type { LucideIcon } from 'lucide-react'

export interface TimelineItem {
	time: string
	event: string
	color: string
}

export interface IntelligenceItem {
	label: string
	color: string
	Icon: LucideIcon
}

export interface WorldCardData {
	label: string
	title: string
	sub: string
	color: string
	Icon: LucideIcon
}

export interface AskRecentItem {
	q: string
	when: string
	answer: string
}

export interface EmailItem {
	initials: string
	bg: string
	name: string
	unread: boolean
	time: string
	subject: string
	preview: string
	ai: string
	aiColor: string
	score: number
	category: string
	tag: MailFilterTag
}

export type MailFilterTag = 'Reply' | 'Critical' | 'Travel' | 'Finance'

export interface TaskTag {
	label: string
	color: string
	bg: string
}

export interface TaskItem {
	title: string
	date: string
	source: string
	tags: TaskTag[]
	sq: string
	dot: string
	urgent: boolean
}

export interface ProfileData {
	initial: string
	name: string
	email: string
	status: string
}
