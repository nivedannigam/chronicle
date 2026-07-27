import { useFamilyContext } from '@/features/family/context/FamilyContext'

export function useHealthMemberCopy() {
	const { selectedMember } = useFamilyContext()
	const name = selectedMember?.displayName ?? null

	return {
		name,
		heroLabel: name ? `How ${name} is doing` : 'How you are doing',
		possessive: name ? `${name}'s` : 'Your',
		yourOrTheir: name ? `${name}'s` : 'your',
		object: name ? 'them' : 'you',
	}
}
