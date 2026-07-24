interface HomeGreetingProps {
	greeting: string
	greetingName: string
	dateLabel: string
}

export function HomeGreeting({
	greeting,
	greetingName,
	dateLabel,
}: HomeGreetingProps) {
	return (
		<div style={{ marginBottom: 28 }}>
			<div
				style={{
					fontSize: 13,
					color: 'rgba(255,255,255,0.42)',
					marginBottom: 8,
					fontWeight: 500,
				}}
			>
				{dateLabel}
			</div>
			<div
				style={{
					fontSize: 34,
					fontWeight: 700,
					letterSpacing: '-0.04em',
					lineHeight: 1.08,
					color: '#FFFFFF',
				}}
			>
				{greeting},
				<br />
				<span style={{ color: 'rgba(255,255,255,0.88)' }}>{greetingName}.</span>
			</div>
		</div>
	)
}
