import { useNavigate } from 'react-router-dom'
import {
	ChevronRight,
	Diamond,
	FileText,
	GraduationCap,
	Heart,
	Landmark,
	Plane,
	Shield,
} from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { FigmaScreenHeader } from '@/ui/figma/shell/FigmaScreenHeader'
import { FC, FigmaLbl } from '@/ui/figma/v2/atoms'

const COMING_SOON_MODULES = [
	{
		label: 'Finance',
		icon: <Landmark size={28} color={FC.green} strokeWidth={1.5} />,
		grad: 'linear-gradient(145deg,rgba(16,185,129,0.16),rgba(16,185,129,0.06))',
		border: 'rgba(16,185,129,0.22)',
		color: FC.green,
		preview: 'finance' as const,
	},
	{
		label: 'Travel',
		icon: <Plane size={28} color={FC.amber} strokeWidth={1.5} />,
		grad: 'linear-gradient(145deg,rgba(245,158,11,0.16),rgba(245,158,11,0.06))',
		border: 'rgba(245,158,11,0.22)',
		color: FC.amber,
		preview: 'travel' as const,
	},
	{
		label: 'Education',
		icon: <GraduationCap size={28} color={FC.teal} strokeWidth={1.5} />,
		grad: 'linear-gradient(145deg,rgba(6,182,212,0.16),rgba(6,182,212,0.06))',
		border: 'rgba(6,182,212,0.22)',
		color: FC.teal,
		preview: 'education' as const,
	},
	{
		label: 'Assets',
		icon: <Diamond size={28} color={FC.pink} strokeWidth={1.5} />,
		grad: 'linear-gradient(145deg,rgba(236,72,153,0.16),rgba(236,72,153,0.06))',
		border: 'rgba(236,72,153,0.22)',
		color: FC.pink,
		preview: 'assets' as const,
	},
	{
		label: 'Property',
		icon: <span style={{ fontSize: 28 }}>🏠</span>,
		grad: 'linear-gradient(145deg,rgba(249,115,22,0.16),rgba(249,115,22,0.06))',
		border: 'rgba(249,115,22,0.22)',
		color: FC.orange,
		preview: 'property' as const,
	},
]

function ModulePreviewSvg({
	preview,
	color,
}: {
	preview: (typeof COMING_SOON_MODULES)[number]['preview']
	color: string
}) {
	return (
		<svg
			width={80}
			height={48}
			style={{ position: 'absolute', right: -4, bottom: -4, opacity: 0.12 }}
			aria-hidden
		>
			{preview === 'finance' &&
				[20, 32, 24, 40, 28, 36].map((height, index) => (
					<rect
						key={index}
						x={index * 12 + 2}
						y={48 - height}
						width={8}
						height={height}
						rx={2}
						fill={color}
					/>
				))}
			{preview === 'travel' && (
				<>
					<path
						d="M8 40 Q40 4 72 40"
						fill="none"
						stroke={color}
						strokeWidth={2.5}
						strokeDasharray="4 3"
					/>
					<circle cx={72} cy={40} r={4} fill={color} />
					<circle cx={8} cy={40} r={4} fill={color} />
				</>
			)}
			{preview === 'education' &&
				[8, 16, 24, 32, 40].map((y, index) => (
					<line
						key={y}
						x1={10}
						y1={y}
						x2={index % 2 === 0 ? 60 : 50}
						y2={y}
						stroke={color}
						strokeWidth={2.5}
						strokeLinecap="round"
					/>
				))}
			{preview === 'assets' && (
				<path
					d="M40 4 L72 28 L40 48 L8 28 Z"
					fill="none"
					stroke={color}
					strokeWidth={2.5}
				/>
			)}
			{preview === 'property' && (
				<path
					d="M40 6 L70 28 L64 28 L64 46 L16 46 L16 28 L10 28 Z"
					fill="none"
					stroke={color}
					strokeWidth={2.5}
					strokeLinejoin="round"
				/>
			)}
		</svg>
	)
}

export function FigmaMoreScreen() {
	const navigate = useNavigate()

	return (
		<div style={{ padding: '0 22px 24px' }}>
			<FigmaScreenHeader
				title="Modules"
				subtitle="Every part of your life, one Chronicle"
				paddingBottom={22}
			/>

			<div style={{ marginBottom: 22 }}>
				<div style={{ marginBottom: 12 }}>
					<FigmaLbl>Available</FigmaLbl>
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{[
						{
							label: 'Health',
							sub: 'Reports, progress, insights',
							path: ROUTES.health,
							icon: <Heart size={24} color={FC.teal} strokeWidth={1.5} />,
							color: FC.teal,
							grad: 'linear-gradient(145deg,rgba(45,207,193,0.16),rgba(45,207,193,0.06))',
							border: 'rgba(45,207,193,0.22)',
						},
						{
							label: 'Insurance',
							sub: 'Policies, protection, claims',
							path: ROUTES.insurance,
							icon: <Shield size={24} color={FC.blue} strokeWidth={1.5} />,
							color: FC.blue,
							grad: 'linear-gradient(145deg,rgba(59,130,246,0.16),rgba(59,130,246,0.06))',
							border: 'rgba(59,130,246,0.22)',
						},
						{
							label: 'Documents',
							sub: 'Library, identity, papers',
							path: ROUTES.documents,
							icon: <FileText size={24} color={FC.purple} strokeWidth={1.5} />,
							color: FC.purple,
							grad: 'linear-gradient(145deg,rgba(139,92,246,0.16),rgba(139,92,246,0.07))',
							border: 'rgba(139,92,246,0.28)',
						},
					].map((module) => (
						<button
							key={module.label}
							type="button"
							onClick={() => navigate(module.path)}
							style={{
								width: '100%',
								background: module.grad,
								border: `1px solid ${module.border}`,
								borderRadius: 22,
								padding: '18px 20px',
								display: 'flex',
								alignItems: 'center',
								gap: 16,
								cursor: 'pointer',
								fontFamily: 'inherit',
								textAlign: 'left',
							}}
						>
							<div
								style={{
									width: 48,
									height: 48,
									borderRadius: 16,
									background: `${module.color}18`,
									border: `1px solid ${module.color}28`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flexShrink: 0,
								}}
							>
								{module.icon}
							</div>
							<div style={{ flex: 1 }}>
								<p
									style={{
										color: FC.fg,
										fontSize: 16,
										fontWeight: 700,
										margin: '0 0 4px',
									}}
								>
									{module.label}
								</p>
								<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>
									{module.sub}
								</p>
							</div>
							<ChevronRight size={18} color={FC.mid} />
						</button>
					))}
				</div>
			</div>

			<div style={{ marginBottom: 22 }}>
				<div style={{ marginBottom: 12 }}>
					<FigmaLbl>Coming Soon</FigmaLbl>
				</div>
				<div
					style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
				>
					{COMING_SOON_MODULES.map((module) => (
						<div
							key={module.label}
							style={{
								position: 'relative',
								overflow: 'hidden',
								background: module.grad,
								border: `1px solid ${module.border}`,
								borderRadius: 24,
								padding: '20px 16px 16px',
							}}
						>
							<ModulePreviewSvg preview={module.preview} color={module.color} />
							<div style={{ marginBottom: 14 }}>{module.icon}</div>
							<p
								style={{
									color: FC.fg,
									fontSize: 15,
									fontWeight: 700,
									letterSpacing: -0.3,
									marginBottom: 5,
									marginTop: 0,
								}}
							>
								{module.label}
							</p>
							<div
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									gap: 5,
									background: 'rgba(0,0,0,0.2)',
									borderRadius: 8,
									padding: '3px 8px',
								}}
							>
								<div
									style={{
										width: 5,
										height: 5,
										borderRadius: 3,
										background: module.color,
									}}
								/>
								<span
									style={{
										color: module.color,
										fontSize: 10,
										fontWeight: 600,
										letterSpacing: '0.06em',
									}}
								>
									COMING SOON
								</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
