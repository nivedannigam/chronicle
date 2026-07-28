# Chronicle UI Migration Report

**Milestone:** UI migration & stabilization (functional freeze)  
**Figma source:** `_figma-import-v3/src/app/App.tsx`  
**Production UI layer:** `src/ui/figma/`  
**Date:** July 2026

---

## Executive summary

Chronicle’s **tab surfaces** (Home, Health, Ask, More, Profile, Documents) are migrated to Figma v3 with live Supabase/intelligence backends. The app shell (phone frame, bottom nav, safe areas, PWA) is in place. **~75% of user-facing UI** matches Figma; remaining work is **secondary pages** (family, timeline, connectors, detail views) and **legacy Mail/Tasks** modules that predate Figma v3.

**This is not a rewrite.** Business logic, hooks, services, and AI architecture are unchanged.

---

## 1. Screen mapping

| Figma screen         | Route                                         | UI implementation          | Backend                                  | Status                                            |
| -------------------- | --------------------------------------------- | -------------------------- | ---------------------------------------- | ------------------------------------------------- |
| Home                 | `/home`                                       | `FigmaHomeScreen`          | `useCommandCenter`, family, onboarding   | ✅ Done                                           |
| Health → Overview    | `/health`                                     | `FigmaHealthOverviewView`  | `useHealthCompanion`, knowledge graph    | ✅ Done                                           |
| Health → Reports     | `/health/reports`                             | `FigmaHealthReportsView`   | Member health reports                    | ✅ Done                                           |
| Health → Timeline    | `/health/timeline`                            | `FigmaHealthTimelineView`  | Journey events                           | ✅ Done                                           |
| Health → Metrics     | `/health/metrics`                             | `FigmaHealthMetricsView`   | Metric groups                            | ✅ Done                                           |
| Health → Insights    | `/health/insights`                            | `FigmaHealthInsightsView`  | Insights engine                          | ✅ Done                                           |
| Health → Setup       | `/health/settings`                            | `HealthSettingsPage`       | Drive, folders, import                   | ✅ Done                                           |
| Ask Chronicle        | `/ask`                                        | `FigmaAskScreen`           | `useAskChronicle`, intelligence pipeline | ✅ Done                                           |
| More                 | `/more`                                       | `FigmaMoreScreen`          | Module launcher                          | ✅ Done                                           |
| Documents            | `/documents`                                  | `FigmaDocumentsScreen`     | `useMemberDocuments`                     | ✅ Done                                           |
| Profile              | `/profile`                                    | `FigmaProfileScreen`       | Auth, family, stats                      | ✅ Done                                           |
| **Search**           | `/search`                                     | `FigmaSearchScreen`        | Global search via intelligence providers | ✅ Done                                           |
| Auth / Login         | `/login`                                      | `LoginPage`                | Supabase OAuth                           | ⚠️ Partial — custom screen, Figma-aligned styling |
| Auth callback        | `/auth/callback`                              | `AuthCallbackPage`         | Session exchange                         | ✅ Done                                           |
| 404                  | `*` (in shell)                                | `FigmaNotFoundScreen`      | —                                        | ✅ Done                                           |
| Family               | `/family/*`                                   | Family pages               | Supabase family                          | ⚠️ Partial — mixed Figma/legacy chrome            |
| Life timeline        | `/timeline`                                   | `TimelinePage`             | Timeline engine                          | ⚠️ Partial — Figma filters, legacy page shell     |
| Document detail      | `/documents/:id`                              | `DocumentDetailPage`       | Supabase                                 | ⚠️ Partial                                        |
| Documents expiring   | `/documents/expiring`                         | `DocumentsExpiringPage`    | Live docs                                | ⚠️ Partial                                        |
| Health report detail | `/health/reports/:id`                         | `HealthReportDetailPage`   | Report detail hook                       | ⚠️ Partial                                        |
| Health metric detail | `/health/metrics/:id`                         | `HealthMetricTimelinePage` | Knowledge graph                          | ⚠️ Partial — legacy header                        |
| Settings sub-pages   | `/settings/*`                                 | `settings-ui.tsx` pages    | Mixed                                    | ⚠️ Partial                                        |
| Integrations / Drive | `/integrations`, `/settings/connectors/drive` | Legacy layout              | Connectors                               | ⚠️ Partial                                        |
| Import review        | `/health/import/review`                       | `ImportReviewPage`         | Import pipeline                          | ⚠️ Partial                                        |
| Mail                 | `/mail`                                       | `MailPage`                 | **Mock data only**                       | ❌ Legacy — no Figma screen, no backend           |
| Tasks                | `/tasks`                                      | `TasksPage`                | **Mock data only**                       | ❌ Legacy — no Figma screen, no backend           |

---

## 2. Components migrated (Figma → production)

| Component                         | Path                                              |
| --------------------------------- | ------------------------------------------------- |
| App shell                         | `src/ui/figma/shell/FigmaPhoneShell.tsx`          |
| Bottom nav                        | `src/ui/figma/shell/FigmaBottomNav.tsx`           |
| Status bar (desktop preview only) | `src/ui/figma/shell/StatusBar.tsx`                |
| Install banner                    | `src/ui/figma/shell/BrowserInstallBanner.tsx`     |
| Home                              | `src/ui/figma/screens/FigmaHomeScreen.tsx`        |
| Ask                               | `src/ui/figma/screens/FigmaAskScreen.tsx`         |
| More                              | `src/ui/figma/screens/FigmaMoreScreen.tsx`        |
| Documents                         | `src/ui/figma/screens/FigmaDocumentsScreen.tsx`   |
| Profile                           | `src/ui/figma/screens/FigmaProfileScreen.tsx`     |
| Search                            | `src/ui/figma/screens/FigmaSearchScreen.tsx`      |
| Not found                         | `src/ui/figma/screens/FigmaNotFoundScreen.tsx`    |
| Health views (5 tabs)             | `src/ui/figma/health/figma-health-views.tsx`      |
| Health primitives                 | `src/ui/figma/health/figma-health-primitives.tsx` |
| Settings UI                       | `src/ui/figma/settings/settings-ui.tsx`           |
| Atoms / tokens                    | `src/ui/figma/v2/atoms.tsx`, `figma-v2-tokens.ts` |
| Home helpers                      | `src/ui/figma/home/home-ui.tsx`                   |

---

## 3. Components removed / candidates for removal

| Item                                                           | Reason                                     | Action                                           |
| -------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| `src/pages/NotFound/NotFoundPage.tsx`                          | Replaced by `FigmaNotFoundScreen` in shell | Safe to delete after confirming no external refs |
| `src/features/health/pages/HealthDashboardPage.tsx`            | Orphan; alias points to overview           | Delete file                                      |
| `src/features/health/pages/HealthTrendsPage.tsx`               | Superseded by metrics                      | Delete file                                      |
| `src/features/health/hooks/useHealthReport.ts`                 | Unused mock hook                           | Delete                                           |
| `src/features/health/components/HealthPageHeader.tsx`          | Only used by orphan pages                  | Delete with orphans                              |
| Unused Figma primitives (`FigmaAvatar`, `FigmaNavBadge`, etc.) | Never imported                             | Remove from `index.ts` or wire up                |
| `_figma-import/`, `_figma-import-new/`                         | Superseded by v3                           | Keep for reference or archive                    |

**Not removed (functional freeze):** Mail, Tasks — features exist with mock data; removing would violate freeze until real backends exist.

---

## 4. Files modified (this milestone)

### Shell & PWA

- `src/ui/figma/shell/FigmaPhoneShell.tsx`
- `src/ui/figma/shell/FigmaBottomNav.tsx`
- `src/ui/figma/shell/BrowserInstallBanner.tsx`
- `src/constants/colors.ts`
- `vite.config.ts`, `public/manifest.webmanifest`, `index.html`, `src/main.tsx`
- `vercel.json`, `src/lib/app-url.ts`

### Core screens

- `src/ui/figma/screens/FigmaHomeScreen.tsx`
- `src/ui/figma/screens/FigmaAskScreen.tsx`
- `src/ui/figma/screens/FigmaMoreScreen.tsx`
- `src/ui/figma/screens/FigmaDocumentsScreen.tsx`
- `src/ui/figma/screens/FigmaProfileScreen.tsx`
- `src/ui/figma/screens/FigmaSearchScreen.tsx` _(new)_
- `src/ui/figma/health/figma-health-views.tsx`
- `src/ui/figma/health/figma-health-primitives.tsx`
- `src/features/health/components/HealthLayout.tsx`

### Auth

- `src/features/auth/services/auth.service.ts`
- `src/features/auth/components/AuthCallbackPage.tsx`
- `src/features/auth/components/LoginPage.tsx`
- `src/lib/supabase.ts`

### Search _(new feature surface, existing backend)_

- `src/features/search/services/global-search.service.ts`
- `src/features/search/hooks/useGlobalSearch.ts`
- `src/features/search/pages/SearchPage.tsx`

### Routing

- `src/app/router.tsx`
- `src/constants/routes.ts`
- `src/lib/navigation.ts`

---

## 5. Mock implementations removed / remaining

### Removed from primary UI paths

- Home, Health, Ask, Documents, Profile — all use live Supabase / intelligence data
- Search — uses `searchChronicle()` across registered knowledge providers

### Remaining mock (intentional or backend gap)

| Location                                            | Used by                   | Notes                                          |
| --------------------------------------------------- | ------------------------- | ---------------------------------------------- |
| `src/features/mail/constants/mock-data.ts`          | Mail page                 | No mail backend — **functional freeze: keep**  |
| `src/features/tasks/constants/mock-data.ts`         | Tasks page                | No tasks backend — **functional freeze: keep** |
| `src/features/health/services/mockHealth.ts`        | Ask mock engine path only | Not used by main health UI                     |
| `src/features/ask/services/mock-*.ts`               | Fallback engines          | Not default in production                      |
| `src/features/knowledge/services/mock-knowledge.ts` | Seeding                   | Dev/test                                       |

---

## 6. Backend integrations completed

| Surface           | Hooks / services                                                                        |
| ----------------- | --------------------------------------------------------------------------------------- |
| Home              | `useCommandCenter`, `useFamilyContext`, `useOnboarding`                                 |
| Health (all tabs) | `useHealthCompanion`, `useHealthMemberSetup`, `useMemberHealthReports`, knowledge graph |
| Ask               | `useAskChronicle`, intelligence orchestrator, grounded response builder                 |
| Documents         | `useMemberDocuments`, category/expiry logic                                             |
| Profile           | `useAuth`, `useUser`, `useFamilyContext`, doc/report counts                             |
| Search            | `useGlobalSearch` → health/documents/timeline providers                                 |
| Auth              | Supabase OAuth + PKCE, `/auth/callback`                                                 |
| Connectors        | Google Drive incremental OAuth (unchanged logic)                                        |

---

## 7. Remaining technical debt

| Priority | Item                                                                                         |
| -------- | -------------------------------------------------------------------------------------------- |
| P0       | Migrate **family**, **timeline**, **integrations**, **document detail** to full Figma chrome |
| P0       | Consolidate **dual token systems** (`C.*` legacy vs `FC.*` Figma)                            |
| P1       | **Mail / Tasks** — either add real backends or hide routes until Figma modules ship          |
| P1       | **Health sub-pages** (metric detail, compare, import review) — Figma polish                  |
| P2       | Delete orphan health dashboard/trends files                                                  |
| P2       | Code-split Ask/Health bundles (>500 kB chunk warning)                                        |
| P2       | Family mini-rings on health overview (needs per-member scores)                               |
| P3       | Login screen — pixel-match Figma v3 auth chrome                                              |

---

## 8. Regression risks

| Risk                                    | Mitigation                                                        |
| --------------------------------------- | ----------------------------------------------------------------- |
| OAuth domain hop (multiple Vercel URLs) | `VITE_APP_URL`, `vercel.json` redirect, canonical `buildAppUrl()` |
| iOS Safari browser chrome               | Install banner + Add to Home Screen flow                          |
| Search provider failures                | Isolated per-provider try/catch                                   |
| Bottom nav overlap on mobile Safari     | `mobileBrowserChromeInset()` + content padding                    |
| Ask without AI provider                 | Grounded-only mode still works                                    |
| Functional freeze violations            | No Mail/Tasks removal; mock data preserved                        |

---

## 9. Performance improvements

- **PWA service worker** — precache, offline shell (`vite-plugin-pwa`)
- **PNG icons** — installability on iOS/Android
- **React Query** — unchanged; all data fetching still cached
- **Recommended next:** lazy-load Health sub-routes, Ask conversation thread, document detail

---

## 10. Mobile improvements

- Mobile-first shell: full viewport on phone, phone frame only on desktop preview
- Fake status bar hidden on real devices
- Safe-area insets: top, bottom nav, login, auth callback
- Safari bottom toolbar offset for nav + scroll content
- PWA manifest: `standalone`, `scope: /`, PNG icons 180/192/512
- Install hint banner on mobile browser
- Canonical URL: `chronicle-pa.vercel.app`

---

## 11. Accessibility improvements

| Area          | Status                                                        |
| ------------- | ------------------------------------------------------------- |
| Touch targets | Bottom nav buttons ≥44px; Ask composer accessible             |
| aria-label    | Search/back buttons on Search, Home                           |
| Focus         | Native inputs on search; composer keyboard support            |
| Contrast      | Figma dark tokens (`FC.fg` on `FC.bg`)                        |
| VoiceOver     | **Needs audit** on health tabs, cards, bottom nav labels      |
| Keyboard      | Ask supports Shift+Enter; global keyboard nav **needs audit** |

---

## 12. Release readiness assessment

| Criterion                           | Status                                           |
| ----------------------------------- | ------------------------------------------------ |
| Core tabs match Figma v3            | ✅ Ready                                         |
| Backend fully wired on core tabs    | ✅ Ready                                         |
| No mock data on core tabs           | ✅ Ready                                         |
| Search implemented                  | ✅ Ready                                         |
| PWA installable                     | ✅ Ready (requires deploy + env vars)            |
| Single OAuth domain                 | ✅ Ready (with `VITE_APP_URL` + Supabase config) |
| Secondary pages Figma-complete      | ⚠️ Not ready                                     |
| Mail/Tasks                          | ⚠️ Mock only — acceptable under freeze           |
| Full responsive audit (390/393/430) | ⚠️ Needs manual QA pass                          |
| Premium native feel (installed PWA) | ✅ Ready after Add to Home Screen                |

### Verdict

**Ready for staged release** of core experience (Home · Health · Ask · Documents · Profile · Search) as installed PWA on `chronicle-pa.vercel.app`.

**Not ready** to declare migration 100% complete until secondary pages and token consolidation are done.

---

## Architecture (unchanged)

```
┌─────────────────────────────────────────┐
│  src/ui/figma/          ← Figma UI only │
│  src/features/*/hooks   ← Business logic│
│  src/features/*/services← Supabase, AI  │
└─────────────────────────────────────────┘
         FigmaPhoneShell wraps all auth routes
         Feature pages = thin wrappers → Figma screens
```

---

## QA checklist (manual)

- [ ] iPhone 390 / 393 / 430 — no horizontal scroll
- [ ] Bottom nav fixed on all tab screens
- [ ] Search from Home, Health, Documents headers
- [ ] Google sign-in once on canonical domain
- [ ] Add to Home Screen → no browser bars
- [ ] Health all 6 tabs load real data
- [ ] Ask conversation + suggestions work
- [ ] Documents categories + expiry bar
- [ ] Profile stats match live counts
- [ ] 404 shows in shell with bottom nav

---

## Next phases (post-milestone)

1. **Phase 8b** — Family + Timeline full Figma chrome
2. **Phase 8c** — Document detail, expiring, health report detail
3. **Phase 9** — Delete orphans, unify tokens, remove unused primitives
4. **Phase 10** — Full device QA matrix + accessibility audit
