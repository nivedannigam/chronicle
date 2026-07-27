import type { CSSProperties } from 'react'
import { C } from '@/constants/colors'

export const healthPrimaryButtonStyle: CSSProperties = {
	display: 'inline-flex',
	alignItems: 'center',
	gap: 5,
	fontSize: 12,
	fontWeight: 700,
	color: C.accent,
	background: C.accentDim,
	border: `1px solid ${C.accent}33`,
	borderRadius: 100,
	padding: '8px 12px',
	cursor: 'pointer',
	fontFamily: 'inherit',
	minHeight: 36,
}
