# Property / Home Module — Phase 1 Architecture

## Product objective

Property answers calm, evidence-based questions about homes and land — not property-management software.

| Question                            | Surface               |
| ----------------------------------- | --------------------- |
| What properties do I have?          | Property Home         |
| What do I need to know?             | Property Detail       |
| What documents do I have?           | Library → Property    |
| What is expiring / needs attention? | Home attention        |
| What happened over time?            | History + `/timeline` |

## UX patterns reused (and avoided)

**Reuse from Finance / Identity / Vehicles**

- Single root folder assignment + recursive path matching (`module-folder-assignment-resolver`)
- Canonical knowledge builder with setup lifecycle
- Universal Library, Search, Ask, Timeline — no module duplicates
- `MODULE_UX_COPY` empty/organizing states
- Evidence-grounded Ask via `/ask?context=property` (Phase 2 wiring)

**Explicitly avoid**

- Leaf-folder setup requirements
- Property-specific Ask or Library tabs
- Duplicate timeline/search engines
- Engineering language in consumer UI
- Auto-creating Finance loans or Insurance policies from property docs

---

## 1. Property entity model

Canonical entity: `PropertyRecord`

| Field                                                | Source                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `displayName`                                        | First folder segment under root (`Home/Pune Home/...`)         |
| `slug`                                               | Normalized key for deduplication                               |
| `propertyType`                                       | Inferred from name/path/text — never guessed from value        |
| `address`, `city`                                    | Explicit extraction only                                       |
| `ownership`                                          | Evidence-based (`individual` / `joint` / `family` / `unknown`) |
| `purchaseDate`, `possessionDate`, `registrationDate` | Document dates                                                 |
| `facts[]`                                            | Provenance-linked canonical facts                              |
| `references[]`                                       | Cross-module IDs (reference-only)                              |
| `resolutionState`                                    | `resolved` / `ambiguous` / `unresolved`                        |

**Dedup rule:** `Pune Home Sale Agreement` + `Pune Home Property Tax` → **one** property (`pune-home`).  
`Pune Home` + `Nagpur Home` → **two** properties.

## 2. Document taxonomy

13 controlled types in `property-type.registry.ts`:

Purchase/Sale · Agreement · Registration · Possession · Property Tax · Society/Maintenance · Home Loan · Utility · Property Insurance · Warranty · Renovation · Legal · **Other**

Unknown stays **Other** — never forced into wrong categories.

## 3. Folder structure

```
Home/                          ← single root assignment
  Pune Home/                   ← property entity
    Purchase/
    Registration/
    Property Tax/
    Society/
    Home Loan/
  Nagpur Home/
    ...
```

Recursive discovery via existing prefix assignment resolver.

## 4. Knowledge model

`PropertyKnowledge` aggregates:

- `properties[]` — canonical entities
- `documents[]` — classified refs with masked identifiers
- `attention[]` — deterministic, evidence-backed
- `timeline[]` — life events with domain dates
- `summary` + `limitations` — consumer copy

Builder: `buildPropertyKnowledge()` in `property-knowledge.builder.ts`.

## 5. Cross-module references

| From Property          | To                 | Behavior                                           |
| ---------------------- | ------------------ | -------------------------------------------------- |
| Home loan document     | Finance            | `reference-only:*` — **no Finance entity created** |
| Property insurance doc | Insurance          | Reference to policy ID when known                  |
| Document               | Documents registry | `chronicleDocumentId`                              |
| Owner                  | Family member      | `ownerMemberId`                                    |
| Event                  | Timeline           | Universal timeline provider (Phase 2)              |

## 6–9. UX surfaces (Phase 2 UI)

**Home** — property cards, recent activity, attention, links to Library/History/Settings  
**Detail** — overview, key details, documents, linked insurance/loan, history  
**History** — property life events only (no upload/processing noise)  
**Settings** — Connected folder · Privacy · Advanced (rescan, integrity audit)

## 10–13. Platform integration (Phase 2 wiring)

| Surface  | Integration point                                           |
| -------- | ----------------------------------------------------------- |
| Library  | `property-module.provider.ts` → `Library → Property`        |
| Search   | `property-intelligence.provider.ts` + `SearchContextModule` |
| Ask      | `plan-property-evidence.ts` + `/ask?context=property`       |
| Timeline | `property-timeline.provider.ts`                             |

## 14. Privacy

- Registration numbers masked via `maskPropertyIdentifier()`
- Addresses shortened on cards (`maskPropertyAddressLine`)
- No legal numbers in Search / Timeline / Home cards

## 15. Family model

- `filterPropertyKnowledgeForMember()` filters visibility
- Does **not** mutate canonical ownership
- Joint ownership visible when multiple `ownerMemberIds` present

## 16. AI policy

| Surface                                 | AI                                   |
| --------------------------------------- | ------------------------------------ |
| New document extraction                 | Allowed when structured facts needed |
| Home / Library / Search / Timeline load | **No AI**                            |
| Structured Ask lookup                   | Prefer no AI                         |
| Narrative Ask                           | AI + canonical evidence only         |

## 17. Database (Phase 2+)

Minimum schema design:

```
properties
property_documents
property_facts
property_timeline_events
```

Reuse existing document registry — no duplicate blob storage.

## 18. Reusable components

- `ModuleSettingsConnectedFolderCard`
- `ModuleSettingsSection` / `ModuleSettingsAdvancedSection`
- `FamilyMemberSwitcher`
- `FigmaScreenHeader`
- `module-folder-assignment-resolver`
- Universal Search / Ask / Timeline / Library

## 19. New components required (Phase 2)

- `PropertyLayout`, `PropertyHomePage`, `PropertyDetailPage`, `PropertyHistoryPage`, `PropertySettingsPage`
- `PropertyModuleFolderPicker`
- `property-intelligence.provider.ts`
- `property-timeline.provider.ts`
- `property-evidence.resolver.ts`

## 20. Risks

| Risk                                      | Mitigation                              |
| ----------------------------------------- | --------------------------------------- |
| Duplicate properties from naming variants | Slug-based merge + integrity audit      |
| Home loan doc creates Finance loan        | Reference-only links, negative tests    |
| Over-classification                       | Default to Other                        |
| Ownership inferred from folder owner      | Explicit evidence only; default unknown |
| Property value leakage                    | Never persist estimated value           |

## 21. Tests

See `property-foundation.test.ts` and `property-integrity-audit.test.ts`.

---

## Phase 1 deliverables (this pass)

- [x] Type system + knowledge builder
- [x] Document taxonomy aligned with global categories
- [x] Folder resolver + entity deduplication
- [x] Attention engine (deterministic)
- [x] Timeline event model (canonical dates)
- [x] Integrity audit (`runPropertyIntegrityAudit`)
- [x] Foundation tests including negative cases
- [ ] UI routes/pages (Phase 2)
- [ ] Search/Ask/Timeline providers (Phase 2)
- [ ] Import runner + AI extraction (Phase 2)
