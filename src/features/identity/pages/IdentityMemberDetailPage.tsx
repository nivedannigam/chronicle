import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES, identityDocumentPath } from '@/constants/routes'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useIdentityContext } from '@/features/identity/context/useIdentityContext'
import { PRIMARY_IDENTITY_TYPE_IDS } from '@/features/identity-knowledge'
import type { IdentityDocumentRecord } from '@/features/identity-knowledge/types/identity-knowledge.types'
import {
	IdentityBackLink,
	IdentityDocumentCard,
	IdentitySectionLabel,
} from '@/ui/figma/identity/identity-ui'
import { FigmaScreenHeader } from '@/ui/figma/shell/FigmaScreenHeader'
import { FC } from '@/ui/figma/v2/atoms'

function groupDocuments(documents: IdentityDocumentRecord[]) {
	const primary: IdentityDocumentRecord[] = []
	const secondary: IdentityDocumentRecord[] = []
	const previous: IdentityDocumentRecord[] = []

	for (const document of documents) {
		if (document.versionRole === 'previous') {
			previous.push(document)
			continue
		}

		if (PRIMARY_IDENTITY_TYPE_IDS.includes(document.typeId)) {
			primary.push(document)
		} else {
			secondary.push(document)
		}
	}

	return { primary, secondary, previous }
}

export function IdentityMemberDetailPage() {
	const navigate = useNavigate()
	const { memberId = '' } = useParams()
	const { members } = useFamilyContext()
	const { knowledge } = useIdentityContext()
	const [previousOpen, setPreviousOpen] = useState(false)

	const member = members.find((entry) => entry.id === memberId)

	const memberDocuments = useMemo(
		() =>
			knowledge.documents.filter(
				(document) => document.ownerMemberId === memberId,
			),
		[knowledge.documents, memberId],
	)

	const groups = useMemo(
		() => groupDocuments(memberDocuments),
		[memberDocuments],
	)

	if (!member) {
		return (
			<div>
				<IdentityBackLink
					label="Identity"
					onClick={() => navigate(ROUTES.identity)}
				/>
				<p style={{ color: FC.dim, fontSize: 14 }}>Family member not found.</p>
			</div>
		)
	}

	return (
		<div style={{ paddingBottom: 24 }}>
			<IdentityBackLink
				label="Identity"
				onClick={() => navigate(ROUTES.identity)}
			/>
			<FigmaScreenHeader
				title={`${member.displayName}'s Identity`}
				paddingBottom={18}
			/>

			<IdentitySectionLabel>Primary documents</IdentitySectionLabel>
			{groups.primary.length > 0 ? (
				groups.primary.map((document) => (
					<IdentityDocumentCard
						key={document.chronicleDocumentId}
						document={document}
						onClick={() =>
							navigate(identityDocumentPath(document.chronicleDocumentId))
						}
					/>
				))
			) : (
				<p style={{ color: FC.dim, fontSize: 13, margin: '0 0 18px' }}>
					No primary identity documents on file yet.
				</p>
			)}

			{groups.secondary.length > 0 ? (
				<>
					<IdentitySectionLabel>Other documents</IdentitySectionLabel>
					{groups.secondary.map((document) => (
						<IdentityDocumentCard
							key={document.chronicleDocumentId}
							document={document}
							onClick={() =>
								navigate(identityDocumentPath(document.chronicleDocumentId))
							}
						/>
					))}
				</>
			) : null}

			{groups.previous.length > 0 ? (
				<>
					<button
						type="button"
						onClick={() => setPreviousOpen((open) => !open)}
						style={{
							width: '100%',
							background: 'none',
							border: 'none',
							padding: '0 0 12px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						<span
							style={{
								color: FC.mid,
								fontSize: 11,
								fontWeight: 700,
								letterSpacing: '0.08em',
								textTransform: 'uppercase',
							}}
						>
							Previous versions ({groups.previous.length})
						</span>
						<span style={{ color: FC.mid, fontSize: 12 }}>
							{previousOpen ? 'Hide' : 'Show'}
						</span>
					</button>
					{previousOpen
						? groups.previous.map((document) => (
								<IdentityDocumentCard
									key={document.chronicleDocumentId}
									document={document}
									onClick={() =>
										navigate(identityDocumentPath(document.chronicleDocumentId))
									}
								/>
							))
						: null}
				</>
			) : null}
		</div>
	)
}
