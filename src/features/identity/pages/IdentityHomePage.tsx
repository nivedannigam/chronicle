import { useNavigate } from 'react-router-dom'
import {
	ROUTES,
	documentsCategoryPath,
	identityAskPath,
	identityDocumentPath,
	identityMemberPath,
} from '@/constants/routes'
import { useIdentityContext } from '@/features/identity/context/useIdentityContext'
import {
	IdentityAskBlock,
	IdentityAttentionCard,
	IdentityEmptyState,
	IdentityHomeSkeleton,
	IdentityLibraryLink,
	IdentitySectionLabel,
	IdentityStatusHero,
	IdentityWalletCard,
} from '@/ui/figma/identity/identity-ui'
import { FC } from '@/ui/figma/v2/atoms'

export function IdentityHomePage() {
	const navigate = useNavigate()
	const { home, setupStatus, isLoading, isError, refetch } =
		useIdentityContext()

	if (isLoading) {
		return <IdentityHomeSkeleton />
	}

	if (isError) {
		return (
			<IdentityEmptyState
				emoji="🪪"
				title="Could not load your identity documents"
				body="Try again in a moment."
				primaryLabel="Try again"
				onPrimary={() => refetch()}
			/>
		)
	}

	if (setupStatus === 'not_connected') {
		return (
			<IdentityEmptyState
				emoji="🪪"
				title="Keep your family's important identity documents together"
				body="Chronicle organizes passports, PAN cards, Aadhaar, licences, and other identity documents from your connected folder."
				primaryLabel="Connect Identity folder"
				onPrimary={() => navigate(ROUTES.identitySettings)}
				secondaryLabel="Works with Google Drive"
			/>
		)
	}

	if (setupStatus === 'scanning' || setupStatus === 'empty') {
		return (
			<div style={{ paddingBottom: 24 }}>
				<IdentityStatusHero
					headline={home.statusHeadline}
					subline={home.statusSubline}
				/>
			</div>
		)
	}

	return (
		<div style={{ paddingBottom: 24 }}>
			<IdentityStatusHero
				headline={home.statusHeadline}
				subline={home.statusSubline}
			/>

			{home.attentionItems.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<IdentitySectionLabel>Needs attention</IdentitySectionLabel>
					{home.attentionItems.map((item) => (
						<IdentityAttentionCard
							key={item.id}
							item={item}
							onClick={() => navigate(identityDocumentPath(item.documentId))}
						/>
					))}
				</div>
			) : null}

			{setupStatus === 'ready' || setupStatus === 'organizing' ? (
				<div style={{ marginBottom: 18 }}>
					<IdentitySectionLabel>Your family</IdentitySectionLabel>
					{home.memberWallets.length > 0 ? (
						home.memberWallets.map((wallet) => (
							<IdentityWalletCard
								key={wallet.memberId}
								wallet={wallet}
								onClick={() => navigate(identityMemberPath(wallet.memberId))}
							/>
						))
					) : (
						<p style={{ color: FC.dim, fontSize: 14, margin: 0 }}>
							Family identity documents will appear here once organized.
						</p>
					)}
				</div>
			) : null}

			{setupStatus === 'ready' ? (
				<>
					<IdentityAskBlock
						suggestions={home.askSuggestions}
						onSelect={(question) => navigate(identityAskPath({ q: question }))}
					/>
					{home.showLibraryLink ? (
						<IdentityLibraryLink
							onClick={() => navigate(documentsCategoryPath('identity'))}
						/>
					) : null}
				</>
			) : null}
		</div>
	)
}
