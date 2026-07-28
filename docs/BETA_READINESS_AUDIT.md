# Chronicle V1 — Beta Readiness Audit

**Audit date:** July 2026  
**Scope:** Profile & Family, Health, Document Intelligence, Chronicle Intelligence (Ask)  
**Objective:** Production-quality polish for public beta — no new features

---

## Executive Summary

Chronicle V1 is **feature-complete** and the core user journeys work end-to-end. The product is **near beta-ready** with a strong foundation in Health, Documents, and Ask. However, **design-system fragmentation**, **search UX gaps**, and **missing offline/error recovery** should be addressed before a broad public beta.

### Beta readiness verdict

| Status                   | Assessment                                                                   |
| ------------------------ | ---------------------------------------------------------------------------- |
| **Core flows**           | ✅ Ready — login, health, documents, ask, search, profile                    |
| **Visual polish**        | ⚠️ Mostly ready — dual design tokens create subtle inconsistency             |
| **Empty/loading states** | ⚠️ Mostly ready — Health strong; Search/Documents had gaps (partially fixed) |
| **Error recovery**       | ⚠️ Needs work — no global offline UX; some errors misclassified              |
| **PWA**                  | ⚠️ Installable but no offline experience                                     |
| **Settings**             | ⚠️ Orphan routes and stub pages remain                                       |

**Recommendation:** Proceed with **limited beta** (invited users) after addressing **Critical** and **High** items below. Full public beta after **Medium** polish sprint.

---

## 1. UX Consistency Findings

### Design system split (High)

Two parallel token systems coexist:

| System                  | Location                                      | Used by                                             |
| ----------------------- | --------------------------------------------- | --------------------------------------------------- |
| `FC` + `figmaCardStyle` | `ui/figma/v2/atoms.tsx`, `figma-v2-tokens.ts` | Home, Documents, Ask, Search, Profile, bottom nav   |
| `C` + `FigmaCard`       | `constants/colors.ts`, `primitives.tsx`       | Health companion components, settings, legacy pages |

**Impact:** Slightly different blues/greens, card radii (18 vs 24px), shadows, and muted text colors across modules.

**Recommendation:** Migrate remaining `C`/`FigmaCard` usage in health companion and settings to `FC`/`figmaCardStyle`. Do not change both systems — pick `FC` as canonical.

### Header patterns (Medium)

Three header systems:

1. **`FigmaScreenHeader`** — tab screens (Ask, Search, Documents, Health layout, Timeline, More)
2. **`ProfilePageShell`** — subpages with 22px title + bordered back button
3. **`HealthSubpageHeader`** — sticky legacy header with `C.bg` and weight 800 titles

**Inconsistencies:**

- Home uses inline `<h1>` at 38px — not `FigmaScreenHeader`
- Profile hub manually duplicates 34px title styling
- Subpage titles: 34px (tabs) vs 22px (ProfilePageShell) vs 34px/800 (HealthSubpageHeader)

**Recommendation:** Standardize subpages on `ProfilePageShell`; adopt `FigmaScreenHeader` on Home when redesigned.

### Spacing (Medium)

| Pattern                   | Value | Where                                     |
| ------------------------- | ----- | ----------------------------------------- |
| v2 horizontal padding     | 22px  | Most Figma screens                        |
| Legacy horizontal padding | 18px  | Settings, health internals, Home skeleton |
| Content bottom padding    | 118px | Floating bottom nav clearance             |

**Fixed this sprint:** Documents hub double-padding (header + wrapper both at 22px).

**Remaining:** `HomePageSkeleton` uses legacy `pagePadding.home` (18px) while live Home uses 22px.

### Typography (Medium)

- **Screen titles:** 4 variants (34/700, 34/800, 38/700, 22/700)
- **Section labels:** 5 duplicate components (`FigmaLbl`, `DocumentSectionLabel`, `AskSectionLabel`, etc.) — identical CSS
- **Search inputs:** 16px (Search), 15px (Documents), 14px (Health)
- **Body muted text:** `FC.mid`, `FC.dim`, `C.textSec`, `C.textMuted`, hardcoded rgba — used interchangeably

**Recommendation:** Collapse section labels into `FigmaLbl`; standardize search input at 16px; document type scale in design tokens.

### Buttons & CTAs (Medium)

Three primary CTA visual languages:

- Purple accent pill (health legacy)
- Solid blue pill (documents)
- Blue→indigo gradient (Ask composer, bottom nav)

Icon buttons: 36×36 bordered (Profile, Ask history) vs bare transparent (header search).

**Recommendation:** Pick one primary CTA style (gradient recommended for brand continuity with Ask tab).

### Card styles (Low)

Border radius overrides everywhere: 16–26px despite `figmaCardStyle` default of 24px. Acceptable for hierarchy but should be documented as intentional scale (hero 26, list 18–20, chip 16).

---

## 2. Empty States Audit

| Module    | Screen                                         | Quality  | Notes                                                 |
| --------- | ---------------------------------------------- | -------- | ----------------------------------------------------- |
| Health    | Overview, Reports, Metrics, Timeline, Insights | ✅ Good  | `DashboardEmptyState` + setup guide + CTAs            |
| Health    | Compare                                        | ✅ Good  | Clear when &lt;2 reports                              |
| Health    | Settings                                       | ⚠️ Fair  | Returns `null` when no user → blank page              |
| Documents | Hub                                            | ⚠️ Fair  | Text-only; explains import path                       |
| Documents | Category                                       | ⚠️ Fair  | Plain paragraph                                       |
| Documents | Expiring                                       | ✅ Good  | Dashed card + emoji                                   |
| Documents | Detail not found                               | ✅ Good  | Centered card message                                 |
| Ask       | Home                                           | ✅ Good  | Greeting, suggestions, insights even with no data     |
| Ask       | History drawer                                 | ⚠️ Fair  | Text-only "No conversations"                          |
| Search    | No results                                     | ✅ Fixed | Dedicated empty + "Ask Chronicle" CTA                 |
| Search    | Initial                                        | ✅ Good  | Recent + Browse categories                            |
| Family    | Overview                                       | ✅ Good  | Best in app — icon, copy, CTA                         |
| Family    | Member detail                                  | ✅ Good  | Not-found card                                        |
| Profile   | Hub                                            | N/A      | Stats show 0 while loading (see loading)              |
| Timeline  | Filtered empty                                 | ⚠️ Fair  | Shows global onboarding empty instead of "no matches" |
| Settings  | Preferences (0 members)                        | ❌ Poor  | Empty member picker, no guidance                      |

**Recommendation:** Add shared `EmptyStateCard` primitive; fix Health Settings null return and Preferences zero-member state.

---

## 3. Loading States Audit

| Module                  | Quality     | Issues                                      |
| ----------------------- | ----------- | ------------------------------------------- |
| Health tabs             | ✅ Good     | `DashboardSkeleton`, `ListSkeleton`         |
| Documents hub           | ✅ Improved | Header preserved during skeleton load       |
| Documents category      | ⚠️ Fair     | Skeleton without shell → title pop-in       |
| Document detail         | ✅ Good     | Dedicated skeleton                          |
| Ask conversation        | ✅ Good     | Streaming skeleton + typing indicator       |
| Ask home                | ⚠️ Fair     | No skeleton while health/docs hooks load    |
| Search                  | ✅ Fixed    | Skeleton while querying                     |
| Profile hub             | ❌ Poor     | Stats flash "0" during fetch                |
| Health Settings/Sources | ❌ Poor     | Generic "Loading…" text                     |
| Drive connector         | ⚠️ Fair     | Text-only "Connecting…"                     |
| Home                    | ✅ Good     | `HomePageSkeleton` when all sources loading |

**Recommendation:** Replace all "Loading…" text with skeletons matching final layout. Add stat pill skeletons to Profile hub.

---

## 4. Error Handling Audit

| Scenario                  | Current behavior                               | Recovery action                          | Priority     |
| ------------------------- | ---------------------------------------------- | ---------------------------------------- | ------------ |
| Ask network/timeout       | `AskErrorBanner` shown                         | ✅ Retry wired (this sprint)             | —            |
| Ask AI unavailable        | Silent fallback to grounded answer             | User unaware AI failed                   | Medium       |
| Google Drive disconnect   | Error in connector panel                       | Connect button; no confirm on disconnect | Medium       |
| Drive disconnect failure  | Not surfaced (`disconnectMutation` no onError) | None                                     | High         |
| Document list load fail   | No error banner on hub                         | None                                     | High         |
| Document detail load fail | ✅ Fixed — retry banner                        | Retry                                    | —            |
| Document not found        | Static message                                 | Back to Documents                        | OK           |
| Health tabs               | `InlineErrorBanner` + refetch                  | ✅ Retry                                 | OK           |
| OCR processing failed     | Partial — OcrStatusBanner in health            | View details                             | OK           |
| Network offline           | No global detection                            | None                                     | **Critical** |
| Sync in progress          | Import journey shows progress                  | OK in import flow                        | OK           |
| Auth session expired      | Redirect to login                              | No return URL preserved                  | High         |
| Sign-out failure          | Not handled                                    | None                                     | Medium       |

**Recommendation:** Add lightweight offline banner via `navigator.onLine` + `online`/`offline` events. Preserve intended route in login redirect.

---

## 5. Search Experience

| Aspect              | Status     | Notes                                                          |
| ------------------- | ---------- | -------------------------------------------------------------- |
| Cross-domain search | ✅ Works   | Health, documents, timeline providers                          |
| Loading indicator   | ✅ Fixed   | Skeleton during active query                                   |
| Empty results       | ✅ Fixed   | Clear message + Ask CTA                                        |
| Recent searches     | ⚠️ Partial | Shows Ask recent questions, not search queries; in-memory only |
| Suggestions         | ✅ Good    | Browse categories + recent                                     |
| Error handling      | ❌ Missing | Provider failures silently skipped                             |
| Filter by domain    | ⚠️ Partial | Browse sets text query, not domain filter                      |

**Recommendation:** Persist search history to localStorage separately from Ask history. Surface search errors when all providers fail.

---

## 6. Performance Observations

### Strengths

- React Query caching with tuned stale times (`query-keys.ts`)
- Ask AI response caching by intent + knowledge fingerprint
- Lazy route components via React Router (standard Vite code splitting)
- Client-side search (fast, no network round-trip)

### Concerns

| Area             | Observation                                              | Priority |
| ---------------- | -------------------------------------------------------- | -------- |
| Initial load     | Full app bundle + Supabase auth check                    | Medium   |
| Health companion | Recomputes on every member/report change                 | Low      |
| Search           | Re-runs all providers on every keystroke (no debounce)   | **High** |
| Large lists      | No virtualization on report/document lists               | Medium   |
| Images           | Document previews fetch signed URLs per view             | Low      |
| Re-renders       | `useGlobalSearch` may re-run on unrelated parent renders | Low      |

**Recommendation:** Debounce search input (200–300ms). Add `useDeferredValue` or debounce to `useGlobalSearch`. Consider virtualizing lists &gt;50 items post-beta.

---

## 7. Mobile Experience

| Check                   | Status             | Notes                                         |
| ----------------------- | ------------------ | --------------------------------------------- |
| Safe areas              | ✅                 | Bottom nav uses `env(safe-area-inset-bottom)` |
| Floating bottom nav     | ✅                 | Glass blur, 118px content padding             |
| Touch targets           | ✅                 | Most buttons ≥36px; chips could be taller     |
| Keyboard (Ask composer) | ✅                 | Auto-resize textarea, bottom-fixed composer   |
| Scrolling               | ✅                 | Per-screen overflow containers                |
| PWA standalone          | ✅                 | Login page has install hint                   |
| Landscape               | ⚠️ Untested        | Phone shell may feel narrow                   |
| Pull-to-refresh         | ❌ Not implemented | Nice-to-have                                  |

---

## 8. Accessibility Observations

| Check               | Status     | Notes                                                                    |
| ------------------- | ---------- | ------------------------------------------------------------------------ |
| Color contrast      | ⚠️         | `FC.dim` and `rgba(255,255,255,0.28)` labels may fail WCAG AA on dark bg |
| Touch targets       | ✅         | Generally ≥44px on primary actions                                       |
| Screen reader       | ⚠️ Partial | Ask has `aria-label` on some lists; many cards lack roles                |
| Keyboard navigation | ⚠️         | Bottom nav and drawers not fully keyboard-trapped                        |
| Focus management    | ⚠️         | History drawer doesn't restore focus on close                            |
| Dynamic text        | ⚠️         | Fixed px font sizes — no rem scaling                                     |
| Form labels         | ✅         | Search inputs have aria-label or placeholder                             |

**Recommendation:** Audit contrast on section labels; add `aria-live` region for Ask streaming responses.

---

## 9. Settings Review

### Active routes (Profile hub)

- Personal, Family, Connections, Drive, Preferences, Security — all reachable

### Orphan / hidden routes

| Route                     | Page                        | Issue                                    |
| ------------------------- | --------------------------- | ---------------------------------------- |
| `/settings/notifications` | `SettingsNotificationsPage` | Routed but not linked from Profile       |
| `/settings/appearance`    | `SettingsAppearancePage`    | Same                                     |
| `/settings/data`          | Redirects to Security       | OK but confusing                         |
| —                         | `SettingsDataPage`          | Dead code — logic duplicated in Security |
| —                         | `IntegrationsPage`          | Dead code — `/integrations` redirects    |

### Stub settings ("Coming soon")

- Personal: phone, DOB, emergency contact, language
- Security: passkeys, multi-device sessions
- Notifications / Appearance: placeholder pages

**Recommendation:** Hide orphan routes from router or link from Preferences. Remove dead code pages. Label stubs clearly in UI.

---

## 10. PWA & Offline

| Check           | Status                          |
| --------------- | ------------------------------- |
| Installable     | ✅ manifest + icons + meta tags |
| Service worker  | ✅ Workbox precache, autoUpdate |
| Offline shell   | ✅ SPA fallback to index.html   |
| Offline content | ❌ No cached data reads         |
| Offline UI      | ❌ No "you're offline" banner   |
| Update prompt   | ❌ Silent auto-update           |
| OAuth on PWA    | ✅ PKCE + /auth/callback        |

**Recommendation:** Add offline banner component in `FigmaPhoneShell`. Optional: "Update available" toast on SW update.

---

## 11. QA — User Flow Review

| Flow                         | Status | Issues                                 |
| ---------------------------- | ------ | -------------------------------------- |
| Google login                 | ✅     | No deep-link return after forced login |
| Auth callback                | ✅     | Error → login with message             |
| Profile setup                | ✅     |                                        |
| Add family member            | ✅     |                                        |
| Upload/import health reports | ✅     | Drive import journey solid             |
| View health reports          | ✅     |                                        |
| Document hub → detail        | ✅     | Error recovery improved                |
| Ask question                 | ✅     | Retry on error; deep links work        |
| Search → result              | ✅     | Empty state fixed                      |
| Navigation (bottom nav)      | ✅     | Consistent across modules              |
| Drive connect/disconnect     | ⚠️     | No disconnect confirm; errors silent   |
| Sign out                     | ⚠️     | No error handling                      |

---

## 12. Prioritized Fix List

### Critical (block broad public beta)

| #   | Issue                                                       | Module | Effort |
| --- | ----------------------------------------------------------- | ------ | ------ |
| C1  | No offline detection or user messaging                      | Global | S      |
| C2  | Search input not debounced — performance on large libraries | Search | S      |

### High (fix before limited beta)

| #   | Issue                                                      | Module     | Effort |
| --- | ---------------------------------------------------------- | ---------- | ------ |
| H1  | Document hub load failure — no error banner                | Documents  | S      |
| H2  | Auth redirect loses intended destination                   | Auth       | S      |
| H3  | Drive disconnect errors not surfaced                       | Connectors | S      |
| H4  | Profile stats flash "0" while loading                      | Profile    | S      |
| H5  | Dual design tokens (`C` vs `FC`) — migrate health/settings | Global     | L      |
| H6  | Search "Recent" is Ask history in RAM, lost on refresh     | Search     | M      |

### Medium (polish sprint)

| #   | Issue                                                      | Module    | Effort |
| --- | ---------------------------------------------------------- | --------- | ------ |
| M1  | Health Settings returns null → blank page                  | Health    | S      |
| M2  | Timeline filtered empty shows wrong message                | Timeline  | S      |
| M3  | Preferences empty when no family members                   | Settings  | S      |
| M4  | Orphan settings routes (notifications, appearance)         | Settings  | S      |
| M5  | Ask AI failures silently fallback — no transparency option | Ask       | M      |
| M6  | Consolidate 5 section label components                     | Global    | S      |
| M7  | Home skeleton padding mismatch (18 vs 22px)                | Home      | S      |
| M8  | Documents category skeleton without shell                  | Documents | S      |
| M9  | Generic "Loading…" in Health Settings/Sources              | Health    | S      |
| M10 | Search provider errors silently swallowed                  | Search    | S      |

### Low (nice-to-have)

| #   | Issue                                                     | Module      | Effort |
| --- | --------------------------------------------------------- | ----------- | ------ |
| L1  | Remove dead code (`SettingsDataPage`, `IntegrationsPage`) | Settings    | S      |
| L2  | SW update prompt for users                                | PWA         | S      |
| L3  | Pull-to-refresh on Home/Timeline                          | Global      | M      |
| L4  | List virtualization for 50+ items                         | Health/Docs | M      |
| L5  | Landscape layout optimization                             | Shell       | M      |
| L6  | aria-live for Ask streaming                               | Ask         | S      |
| L7  | Unify primary CTA button style                            | Global      | M      |
| L8  | Sign-out error handling                                   | Auth        | S      |

_Effort: S = small (&lt;2hr), M = medium (half day), L = large (1+ days)_

---

## 13. Fixes Applied This Sprint

The following high-impact polish items were addressed during this audit:

1. **Search empty results** — dedicated zero-results state with "Ask Chronicle" CTA (`FigmaSearchScreen.tsx`)
2. **Search loading** — skeleton while query active (`FigmaSearchScreen.tsx`)
3. **Ask error retry** — `onRetry` wired to last failed question (`FigmaAskScreen.tsx`)
4. **Documents header padding** — removed double 22px horizontal padding (`FigmaDocumentsScreen.tsx`)
5. **Documents loading** — header preserved during skeleton load (`FigmaDocumentsScreen.tsx`)
6. **Document detail error** — retry banner instead of "not found" on fetch failure (`DocumentDetailPage.tsx`)

---

## 14. Remaining UI Inconsistencies (Quick Reference)

- Home title 38px vs tab titles 34px
- Profile subpage titles 22px vs tab titles 34px
- Health companion cards use `FigmaCard`/`C`; Documents/Ask use `figmaCardStyle`/`FC`
- Settings pages use 18px padding; tabs use 22px
- Mail/Tasks pages use legacy `stickyHeaderStyle` (not in bottom nav — low exposure)
- More page "Coming soon" modules are static non-interactive cards (intentional)

---

## 15. Beta Readiness Confirmation

### Ready for limited beta ✅

These core experiences are cohesive and reliable enough for daily use by invited testers:

- Google authentication and session management
- Health overview, reports, metrics, insights, timeline
- Document intelligence hub, detail, categories, expiring
- Ask Chronicle home, conversation, history, deep links
- Global search with empty/loading states
- Profile, family, Drive connections
- Mobile PWA install and safe-area layout

### Blocking issues for broad public beta ❌

1. **No offline UX** — users on flaky mobile networks get silent failures
2. **Search performance** — undebounced input may lag with large libraries
3. **Design token split** — subtle but noticeable when switching Health ↔ Documents ↔ Ask

### Recommended beta launch plan

1. **Week 1:** Fix Critical + High items (C1–C2, H1–H4)
2. **Week 2:** Medium polish (M1–M10), migrate health companion to `FC` tokens
3. **Week 3:** Limited beta with 20–50 invited users; collect feedback
4. **Week 4:** Address beta feedback; broad public beta

---

_This audit covers UI/UX, flows, and production readiness. It does not cover backend security review, load testing, or App Store submission (PWA-only)._
