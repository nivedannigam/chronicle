# Chronicle Relationship Platform

The Relationship Platform is Chronicle's semantic layer — it connects entities across every domain without moving domain business logic.

## Architecture

```
Domain modules (Health, Insurance, Documents, Vehicles…)
  ↓ GraphDomainAdapter.ingest()
Knowledge Graph Store (entities + relationships)
  ↑ orchestrated by
Relationship Platform (registries, resolvers, ingest API)
  ↓ consumed by
Search · Ask · Timeline · Home · Notifications
```

## Core concepts

| Component                          | Role                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------- |
| **Entity Registry**                | Tracks which domains register which canonical entity types                 |
| **Relationship Provider Registry** | Holds `GraphDomainAdapter` implementations per domain                      |
| **Relationship Platform Service**  | Orchestrates ingest, search, expand, and context building                  |
| **Entity Resolver**                | Maps domain-local IDs → canonical graph IDs (`family-member:abc`)          |
| **Relationship Resolver**          | Maps domain relationship labels → canonical types (`covers`, `belongs_to`) |

## Canonical entity types

People, Documents, Assets, Policies, Health Reports, Claims, Vehicles, Properties, Financial Accounts, Employers, Educational Institutions, Organizations, Trips, Locations, Events, Attachments — defined in `@/shared/knowledge-graph/types/entity.types`.

## Canonical relationship types

`owns`, `covered_by`, `belongs_to`, `related_to`, `references`, `depends_on`, `created_from`, `supports`, `includes`, `attached_to`, `renews`, `replaces`, `supersedes`, `used_by`, `managed_by` — defined in `@/shared/knowledge-graph/types/relationship.types`.

## Domain registration

Domains register via `GraphDomainAdapter`:

```typescript
export const insuranceGraphAdapter: GraphDomainAdapter<InsuranceKnowledge> = {
  domain: 'insurance',
  providerId: 'insurance-knowledge',
  entityTypes: ['InsurancePolicy', 'Claim', 'Coverage', 'Organization', ...],
  ingest(store, knowledge) { /* upsert entities + relationships */ },
}
```

Currently registered: **Health**, **Insurance**, **Documents**.

## Bootstrap

`initializePlatform()` calls `initializeRelationshipPlatform()` which registers all adapters with both the relationship registry and the knowledge graph service.

## Usage

```typescript
import {
	ingestChronicleRelationships,
	defaultRelationshipPlatformService,
} from '@/core/relationship'

const snapshot = ingestChronicleRelationships({
	health: healthKnowledge,
	insurance: insuranceKnowledge,
	documents: chronicleDocuments,
})

const related = defaultRelationshipPlatformService.findRelated({
	entityId: 'family-member:member-1',
	relationshipTypes: ['belongs_to', 'covers'],
	direction: 'incoming',
})
```

## People model

One canonical People model — every entity references `FamilyMember` / `Person` nodes. Family members are never duplicated; domains reference the same `family-member:{id}` graph node.

## Design rules

1. **Domains own data** — adapters translate domain knowledge objects into graph nodes; no business logic moves to the platform.
2. **Platform owns relationships** — no domain builds its own cross-module relationship model.
3. **Invisible to users** — the graph powers Search, Ask, Timeline, and Home without UI changes.
4. **Gradual migration** — existing modules keep working; new modules (Vehicles) build directly on adapters.

## File layout

```
src/core/relationship/
  bootstrap/          — register-relationship-providers, initialize-relationship-platform
  contracts/          — shared interfaces
  registries/         — relationship-provider-registry
  services/           — platform service, entity resolver, relationship resolver
  __tests__/          — platform tests

src/shared/knowledge-graph/
  adapters/           — health, insurance, documents graph adapters
  store/              — in-memory graph store
  services/           — traversal, context building
  types/              — canonical entity and relationship types
```
