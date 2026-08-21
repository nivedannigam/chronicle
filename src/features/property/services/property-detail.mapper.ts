import {
	documentPath,
	financeAskPath,
	globalAskPath,
	insuranceAskPath,
	propertyDocumentPath,
	propertyHistoryEventPath,
} from '@/constants/routes'
import type {
	PropertyAttentionItem,
	PropertyDocumentRecord,
	PropertyKnowledge,
	PropertyRecord,
	PropertyTimelineEvent,
} from '@/features/property-knowledge/types/property-knowledge.types'
import { formatOwnershipLabel } from '@/features/property-knowledge'

export interface PropertyDetailViewModel {
	slug: string
	displayName: string
	propertyTypeLabel: string
	locationLabel: string
	ownershipLabel: string
	statusLabel: string
	keyFacts: Array<{ label: string; value: string }>
	importantDates: Array<{ label: string; value: string }>
	attentionItems: PropertyAttentionItem[]
	linkedInsurance: Array<{ label: string; path: string }>
	linkedFinance: Array<{ label: string; path: string }>
	documents: Array<{
		id: string
		title: string
		typeLabel: string
		dateLabel: string | null
		path: string
	}>
	history: Array<{
		id: string
		title: string
		dateLabel: string
		path: string
	}>
}

function formatDate(value: string | null): string | null {
	if (!value) return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString('en-US', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

function resolveProperty(
	knowledge: PropertyKnowledge,
	propertySlug: string,
): PropertyRecord | null {
	return (
		knowledge.properties.find((property) => property.slug === propertySlug) ??
		knowledge.properties.find((property) => property.id === propertySlug) ??
		null
	)
}

function buildLinkedInsurance(property: PropertyRecord) {
	return property.references
		.filter((reference) => reference.kind === 'insurance_policy')
		.map((reference) => ({
			label: reference.label,
			path: insuranceAskPath({
				q: `Tell me about ${reference.label} for ${property.displayName}`,
			}),
		}))
}

function buildLinkedFinance(property: PropertyRecord) {
	return property.references
		.filter((reference) => reference.kind === 'finance_loan')
		.map((reference) => ({
			label: reference.label,
			path: financeAskPath({
				q: `What is the balance on ${reference.label}?`,
			}),
		}))
}

function buildDocuments(
	documents: PropertyDocumentRecord[],
): PropertyDetailViewModel['documents'] {
	return documents.map((document) => ({
		id: document.chronicleDocumentId,
		title: document.title,
		typeLabel: document.typeLabel,
		dateLabel: formatDate(document.documentDate),
		path: propertyDocumentPath(document.chronicleDocumentId),
	}))
}

function buildHistory(
	events: PropertyTimelineEvent[],
): PropertyDetailViewModel['history'] {
	return events.map((event) => ({
		id: event.id,
		title: event.title,
		dateLabel: formatDate(event.eventDate) ?? event.eventDate,
		path: propertyHistoryEventPath(event.id),
	}))
}

export function buildPropertyDetailViewModel(input: {
	knowledge: PropertyKnowledge
	propertySlug: string
}): PropertyDetailViewModel | null {
	const property = resolveProperty(input.knowledge, input.propertySlug)

	if (!property) {
		return null
	}

	const documents = input.knowledge.documents.filter(
		(document) => document.propertyId === property.id,
	)
	const attentionItems = input.knowledge.attention.filter(
		(item) => item.propertyId === property.id,
	)
	const history = input.knowledge.timeline.filter(
		(event) => event.propertyId === property.id,
	)

	const locationParts = [property.city, property.address].filter(Boolean)
	const keyFacts = property.facts
		.filter(
			(fact) =>
				!['purchaseDate', 'registrationDate', 'possessionDate'].includes(
					fact.key,
				),
		)
		.slice(0, 6)
		.map((fact) => ({ label: fact.label, value: fact.displayValue }))

	const importantDates = [
		{ label: 'Purchased', value: formatDate(property.purchaseDate) },
		{ label: 'Registered', value: formatDate(property.registrationDate) },
		{ label: 'Possession', value: formatDate(property.possessionDate) },
	].filter((entry): entry is { label: string; value: string } =>
		Boolean(entry.value),
	)

	const statusLabel =
		attentionItems.length > 0
			? `${attentionItems.length} item${attentionItems.length === 1 ? '' : 's'} need attention`
			: property.resolutionState === 'resolved'
				? 'Good'
				: 'Still organizing'

	return {
		slug: property.slug,
		displayName: property.displayName,
		propertyTypeLabel: property.propertyTypeLabel,
		locationLabel: locationParts.join(' · ') || 'Location not recorded yet',
		ownershipLabel: formatOwnershipLabel({
			ownership: property.ownership,
			ownerNames: property.ownerNames,
		}),
		statusLabel,
		keyFacts,
		importantDates,
		attentionItems,
		linkedInsurance: buildLinkedInsurance(property),
		linkedFinance: buildLinkedFinance(property),
		documents: buildDocuments(documents),
		history: buildHistory(history),
	}
}

export function resolvePropertyDocumentOpenPath(documentId: string): string {
	return documentPath(documentId)
}

export function buildPropertyAskPathForProperty(
	property: PropertyRecord,
	question?: string,
): string {
	return globalAskPath({
		q: question ?? `Tell me about my ${property.displayName}`,
		context: 'property',
		entity: property.slug,
	})
}
