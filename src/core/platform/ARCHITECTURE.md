# Chronicle Core Platform

Chronicle is evolving from standalone modules into a **shared platform** where Health, Insurance, and future domains consume common infrastructure without duplicating it.

This is an **architectural evolution**, not a rewrite. Existing module code continues to work; shared capabilities are introduced gradually behind registries and bootstrap hooks.

## Platform layout

```
Chronicle
├── Core Platform          ← src/core/platform/
│   ├── Documents          ← src/features/documents/
│   ├── Search             ← knowledge providers + search registry
│   ├── Ask                ← intelligence pipeline + AI registry
│   ├── Timeline           ← timeline registry
│   ├── People             ← src/features/family/ (canonical model)
│   ├── Notifications      ← notification registry (extensible)
│   ├── AI Platform        ← src/shared/ai/
│   ├── Knowledge Platform ← @chronicle/core-knowledge + providers
│   ├── Connectors         ← src/core/connectors/
│   ├── Shared Settings    ← src/features/settings/ + module-settings-ui
│   └── Design System      ← src/ui/figma/
│
├── Health                 ← domain SSOT + UI; registered on platform
├── Insurance              ← domain SSOT + UI; registered on platform
└── Future modules         ← Vehicles first greenfield consumer
```

## Responsibilities

| Capability    | Owner                               | Module responsibility                           |
| ------------- | ----------------------------------- | ----------------------------------------------- |
| Documents     | `DocumentsContext`                  | Domain extraction + linking only                |
| Search        | Knowledge + Search registries       | Domain-specific indexing via providers          |
| Ask           | Intelligence pipeline + AI registry | Domain reasoning stays in module engines        |
| Timeline      | Timeline registry                   | Domain events via timeline providers            |
| People        | `FamilyContext`                     | Reference people; never duplicate family models |
| Notifications | Notification registry               | Modules contribute alerts                       |
| Knowledge     | Knowledge registry                  | `*Knowledge` SSOT per domain                    |
| Settings      | Shared settings framework           | Module preference sections                      |

**The Core Platform never contains domain business rules** — only shared infrastructure and registration.

## Bootstrap

Call once at app startup (already wired in `src/app/providers.tsx`):

```typescript
import { initializePlatform } from '@/core/platform'

initializePlatform()
```

This registers:

- **Platform modules** — Health, Insurance metadata (routes, domains, document categories)
- **Knowledge providers** — health, documents, insurance, timeline
- **Timeline providers** — health, documents, insurance
- **Document consumers** — which modules use which document categories

Legacy import paths remain valid:

- `@/features/intelligence/providers/register-providers` → re-exports platform bootstrap
- `@/features/timeline/providers/register-timeline-providers` → includes insurance provider

## Registries

| Registry     | Location                                                | Purpose                                    |
| ------------ | ------------------------------------------------------- | ------------------------------------------ |
| Module       | `src/core/platform/registries/module-registry.ts`       | Discover enabled Chronicle modules         |
| Knowledge    | `@chronicle/core-search` (re-exported)                  | Ask, search, intelligence context          |
| Timeline     | `src/features/timeline/registry/` (re-exported)         | Universal life timeline                    |
| Search       | `src/core/platform/registries/search-registry.ts`       | Extra search contributors beyond knowledge |
| Notification | `src/core/platform/registries/notification-registry.ts` | Unified notification center (extensible)   |
| Document     | `src/core/platform/registries/document-registry.ts`     | Module ↔ document category mapping         |
| AI           | `src/shared/ai/intent/intent-registry.ts` (re-exported) | Intent classifiers + evidence selectors    |

## Registering a new module

### Phase 1 — Platform registration (no UI rewrite)

1. **Define the module** in `src/core/platform/modules/register-<module>.module.ts`
2. **Add a knowledge provider** implementing `ChronicleKnowledgeProvider`
3. **Self-register** with `registerKnowledgeProvider(provider)`
4. **Import the provider** in `register-knowledge-providers.ts`
5. **Optional timeline provider** — register in `register-timeline-providers.ts`
6. **Pass sources** via `buildPlatformIntelligenceSources()` for Ask and Search

### Phase 2 — Consume shared UI

- Reuse `src/ui/figma/` primitives
- Reuse `module-settings-ui` for settings sections
- Link documents through `DocumentsContext`

### Phase 3 — Universal experiences

- Register intent classifiers in AI registry
- Implement `ChronicleNotificationContributor`
- Add module section to unified Settings (future)

## Health & Insurance status

| Integration              | Health  | Insurance |
| ------------------------ | ------- | --------- |
| Platform module registry | ✅      | ✅        |
| Knowledge provider       | ✅      | ✅        |
| Timeline provider        | ✅      | ✅        |
| Document consumer        | ✅      | ✅        |
| Module Ask UI            | ✅      | ✅        |
| Universal Ask routing    | Partial | Planned   |

## Vehicles — first greenfield module

Build Vehicles directly on the platform with domain SSOT, providers, shared settings, and timeline from day one.

## Migration principles

1. **No breaking changes** — old imports keep working via re-exports
2. **Additive registration** — providers self-register on import
3. **Domain logic stays in domains** — platform only wires infrastructure
4. **Gradual source wiring** — pass module data through `sources` payloads
