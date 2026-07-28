# Document Intelligence Platform

Chronicle Documents is **not** a file manager and **not** Google Drive inside Chronicle. Google Drive remains the storage layer; Chronicle is the **knowledge layer** on top.

Users think in life meaning — Passport, Insurance, Property, Health — not folders.

---

## Information Architecture

### Primary mental model

| Layer            | Responsibility                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| **Google Drive** | Storage, sync, sharing, version history, permissions                                                            |
| **Chronicle**    | OCR, metadata extraction, categorization, AI summaries, semantic search, relationships, reminders, intelligence |

### Category taxonomy (meaning-first)

Documents are classified into registry categories:

| Category ID  | Label          | Home grid |
| ------------ | -------------- | --------- |
| `identity`   | Identity       | ✓         |
| `insurance`  | Insurance      | ✓         |
| `property`   | Property       | ✓         |
| `financial`  | Finance        | ✓         |
| `medical`    | Health         | ✓         |
| `employment` | Employment     | ✓         |
| `education`  | Education      | ✓         |
| `other`      | Travel & Other | ✓         |

Future modules (extension points, not yet surfaced in UI):

- Vehicles, Investments, Tax, Utilities, Legal

Manual category override is supported via document metadata (`category_id`, `sub_category_id`).

### Ownership model

Every document belongs to a family member or shared context:

- Me (account owner)
- Spouse / Child / Parent (via `family_member_id`)
- Shared family (no member assignment)
- Unknown

Filterable via family member selector (existing `useMemberDocuments` hook).

---

## Screen Hierarchy

```
/documents                          → Document Home (intelligence hub)
/documents/category/:categoryId     → Category collection view
/documents/expiring                 → Expiring documents list
/documents/:documentId              → Document detail (knowledge view)
/search                             → Global semantic search (includes documents)
/ask                                → Ask Chronicle (document-aware via knowledge provider)
/profile/connections/drive          → Google Drive connector settings (storage layer)
```

### Document Home (`FigmaDocumentsScreen`)

Answers immediately:

1. **How many important documents?** — stat pills
2. **What needs attention?** — attention cards (expired, expiring, recently added)
3. **Which are expiring soon?** — expiring count + link to `/documents/expiring`
4. **What was recently added?** — recently added section
5. **What can I quickly find?** — inline semantic search + global search button

Layout (top → bottom):

```
Search
↓
Stats (total · attention · expiring)
↓
Categories (meaning grid, not folders)
↓
Attention Required
↓
Recently Added
↓
Recent Activity
↓
All Documents
```

### Category View (`DocumentsCategoryPage`)

Filtered list of documents in one meaning category. No folder tree.

### Document Detail (`FigmaDocumentDetailScreen`)

Knowledge view for a single document:

- Preview (signed URL when available)
- AI summary (human-readable, not raw OCR)
- Actions: Summarize, Ask Chronicle, Compare, Open, Drive settings
- Key details (extracted metadata, meaningful fields only)
- Related documents (knowledge graph heuristics)
- Document timeline (uploaded, updated, expired, processed)
- Link to category collection

---

## Components

### Added

| Component                   | Location          | Purpose                        |
| --------------------------- | ----------------- | ------------------------------ |
| `DocumentSearchField`       | `document-ui.tsx` | Inline semantic search on home |
| `DocumentStatPill`          | `document-ui.tsx` | Home stats                     |
| `DocumentAttentionCard`     | `document-ui.tsx` | Actionable attention items     |
| `DocumentSummaryCard`       | `document-ui.tsx` | Card-based document row        |
| `DocumentActivityRow`       | `document-ui.tsx` | Timeline activity row          |
| `DocumentActionChip`        | `document-ui.tsx` | Detail page actions            |
| `DocumentAiBadge`           | `document-ui.tsx` | AI-processed indicator         |
| `DocumentSectionLabel`      | `document-ui.tsx` | Section headers                |
| `FigmaDocumentsScreen`      | `screens/`        | Document home                  |
| `FigmaDocumentDetailScreen` | `screens/`        | Document detail                |
| `DocumentsCategoryPage`     | `pages/`          | Category collection            |

### Removed / Deprioritized

| Previous pattern               | Status                                  |
| ------------------------------ | --------------------------------------- |
| Folder browser / Drive tree UI | Not built — intentionally excluded      |
| Filename-only search           | Replaced by semantic local search       |
| Health-style document detail   | Replaced by `FigmaDocumentDetailScreen` |
| Raw OCR dump on detail         | Replaced by AI summary + key details    |

Legacy `DocumentsExpiringPage` retains functional list; can be restyled to match Figma cards in a follow-up.

---

## Services & Data Flow

```
Google Drive Connector
        ↓ sync
chronicle_documents (Supabase)
        ↓
document-intelligence.service
  · buildDocumentSummary()      → human-readable AI-style summary
  · buildDisplayFields()      → passport number, expiry, etc.
  · buildAttentionItems()     → expiring / expired / recent
  · findRelatedDocuments()    → category relationship graph
  · buildDocumentsHubView()   → home aggregation
  · searchDocumentsLocal()    → semantic token search
        ↓
useDocumentIntelligence hook
        ↓
Figma UI screens
```

### AI capabilities (current)

| Capability        | Implementation                                              | Future                          |
| ----------------- | ----------------------------------------------------------- | ------------------------------- |
| Document summary  | Rule-based from metadata + dates (`buildDocumentSummary`)   | LLM enrichment via Ask pipeline |
| Semantic search   | Token match across title, OCR, metadata, category, owner    | Vector embeddings               |
| Related documents | Category relationship heuristics + same owner               | Knowledge graph engine          |
| Summarize / Ask   | Deep-links to `/ask?q=...`                                  | Inline streaming response       |
| Compare           | Links to health compare (placeholder for cross-doc compare) | Document comparison engine      |

Ask Chronicle integrates documents via `documents-knowledge.provider.ts` (existing).

### Attention rules

Only meaningful actions surface:

- Expired documents (high severity)
- Expiring within 12 months (medium)
- Recently added within 7 days (low)

No noisy notifications.

### Related document graph

Defined in `CATEGORY_RELATIONSHIPS`:

```
Identity  → Insurance, Travel, Finance
Insurance → Identity, Property, Health
Property  → Insurance, Finance, Employment
…
```

Plus same-owner fallback. Shown as related knowledge, not folders.

---

## Future Extension Points

### Finance module

- Extend `financial` category with sub-categories: investments, tax, banking
- Enable `FUTURE_DOCUMENT_MODULES.investments` and `tax` when ready

### Insurance module

- Renewal reminders from `expiry_date` + policy metadata
- Cross-link property ↔ insurance ↔ vehicle

### Travel module

- Split from `other`: passport → visa → tickets → travel insurance chain
- Trip-scoped semantic search ("Everything about my Europe trip")

### Assets module

- Vehicles (`vehicles` category): RC, insurance, service history
- Property registration gaps as attention items

### Google Drive (storage only)

- Open in Google Drive (future — use Drive file ID from connector metadata)
- Download, version history, sharing status (future — delegate to Drive)

---

## File Map

```
src/features/documents/
  constants/document-category-display.ts   # Home categories, relationships, future modules
  types/document-intelligence.types.ts     # Hub, summary, attention, activity types
  services/document-intelligence.service.ts # Core intelligence logic
  hooks/useDocumentIntelligence.ts         # React hook
  pages/
    DocumentsPage.tsx                      # → FigmaDocumentsScreen
    DocumentsCategoryPage.tsx              # Category collection
    DocumentDetailPage.tsx                 # → FigmaDocumentDetailScreen
    DocumentsExpiringPage.tsx              # Expiring list

src/ui/figma/documents/document-ui.tsx     # Shared document UI primitives
src/ui/figma/screens/
  FigmaDocumentsScreen.tsx                 # Document home
  FigmaDocumentDetailScreen.tsx            # Document detail
```

---

## Success Criteria Checklist

- [x] Users organize by meaning (categories), not folders
- [x] Document home answers count, attention, expiring, recent, search
- [x] AI summaries on every processed document (rule-based today)
- [x] Semantic search across title, OCR, metadata, category, owner
- [x] Related documents via knowledge heuristics
- [x] Google Drive stays storage layer; Chronicle adds intelligence
- [ ] LLM-generated summaries (future — Ask integration path exists)
- [ ] Vector semantic search (future)
- [ ] Open in Google Drive deep link (future)
