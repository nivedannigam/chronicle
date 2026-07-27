import { useNavigate } from 'react-router-dom'
import {
	ChevronRight,
	Diamond,
	FileText,
	GraduationCap,
	Landmark,
	Plane,
	Shield,
} from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { FC, FigmaLbl, figmaScreenTitleStyle } from '@/ui/figma/v2/atoms'

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
		label: 'Insurance',
		icon: <Shield size={28} color={FC.blue} strokeWidth={1.5} />,
		grad: 'linear-gradient(145deg,rgba(59,130,246,0.16),rgba(59,130,246,0.06))',
		border: 'rgba(59,130,246,0.22)',
		color: FC.blue,
		preview: 'insurance' as const,
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
			{preview === 'insurance' && (
				<path
					d="M40 4 L68 14 L68 32 Q68 44 40 48 Q12 44 12 32 L12 14 Z"
					fill="none"
					stroke={color}
					strokeWidth={3}
				/>
			)}
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
		<div style={{ padding: '4px 22px 24px' }}>
			<h1 style={{ ...figmaScreenTitleStyle, marginBottom: 6 }}>More</h1>
			<p
				style={{
					color: FC.mid,
					fontSize: 15,
					lineHeight: 1.55,
					marginBottom: 22,
					marginTop: 0,
				}}
			>
				Modules coming to Chronicle
			</p>

			<div style={{ marginBottom: 22 }}>
				<div style={{ marginBottom: 12 }}>
					<FigmaLbl>Available Now</FigmaLbl>
				</div>
				<button
					type="button"
					onClick={() => navigate(ROUTES.documents)}
					style={{
						width: '100%',
						background:
							'linear-gradient(145deg,rgba(139,92,246,0.16),rgba(139,92,246,0.07))',
						border: '1px solid rgba(139,92,246,0.28)',
						borderRadius: 26,
						padding: '22px 22px',
						display: 'flex',
						alignItems: 'center',
						gap: 18,
						cursor: 'pointer',
						boxShadow:
							'0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
						fontFamily: 'inherit',
					}}
				>
					<div
						style={{
							width: 58,
							height: 58,
							borderRadius: 18,
							background: 'rgba(139,92,246,0.2)',
							border: '1px solid rgba(139,92,246,0.3)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<FileText size={28} color={FC.purple} strokeWidth={1.5} />
					</div>
					<div style={{ flex: 1, textAlign: 'left' }}>
						<p
							style={{
								color: FC.fg,
								fontSize: 20,
								fontWeight: 700,
								letterSpacing: -0.6,
								marginBottom: 5,
								marginTop: 0,
							}}
						>
							Documents
						</p>
						<p
							style={{
								color: FC.purple,
								fontSize: 12,
								fontWeight: 600,
								letterSpacing: '0.07em',
								textTransform: 'uppercase',
								margin: 0,
							}}
						>
							Open
						</p>
					</div>
					<ChevronRight size={20} color={FC.mid} />
				</button>
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
