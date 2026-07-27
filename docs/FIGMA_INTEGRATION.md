# Figma ↔ Chronicle Integration Map

## Architecture

| Layer                             | Source                                           | Location        |
| --------------------------------- | ------------------------------------------------ | --------------- |
| UI shell, screens, design system  | Figma Make (`_figma-import-new/src/app/App.tsx`) | `src/ui/figma/` |
| Auth, data, AI, health, documents | Chronicle platform                               | `src/features/` |

## Bottom navigation (Figma source of truth)

| Tab     | Route      | Figma screen   | Backend hook/service                                    |
| ------- | ---------- | -------------- | ------------------------------------------------------- |
| Home    | `/home`    | `HomeScreen`   | `useCommandCenter`, `useOnboarding`, `useFamilyContext` |
| Health  | `/health`  | `HealthScreen` | `useHealthCompanion`                                    |
| Ask     | `/ask`     | `AskScreen`    | `useAskChronicle` (center elevated button)              |
| More    | `/more`    | `MoreScreen`   | `useAuth`, `useUser`, `MODULE_REGISTRY`                 |
| Profile | `/profile` | Profile area   | `useAuth`, settings pages                               |

Mail and Tasks remain routable (`/mail`, `/tasks`) but are accessed via More, not the tab bar.

## Secondary routes (via More / Home, not in tab bar)

| Screen             | Route                     | Backend                                | Figma UI         |
| ------------------ | ------------------------- | -------------------------------------- | ---------------- |
| Health Overview    | `/health`                 | `useHealthCompanion`                   | ✅ Figma v2 pass |
| Health Reports     | `/health/reports`         | `useHealthCompanion`                   | ✅ Figma v2 pass |
| Health Metrics     | `/health/metrics`         | `useHealthCompanion`                   | ✅ Figma v2 pass |
| Health Timeline    | `/health/timeline`        | `useHealthCompanion`                   | ✅ Figma v2 pass |
| Health Insights    | `/health/insights`        | `useHealthCompanion`                   | ✅ Figma v2 pass |
| Health Setup       | `/health/settings`        | `useHealthMemberSetup`, import journey | ✅ Figma v2 pass |
| Report detail      | `/health/reports/:id`     | `useHealthReportDetail`                | ✅ Visual pass   |
| Documents          | `/documents`              | `useDocuments`                         | ✅ Visual pass   |
| Document detail    | `/documents/:id`          | `getDocument`                          | ✅ Visual pass   |
| Family             | `/family`                 | `useFamilyContext`                     | ✅ Visual pass   |
| Life Timeline      | `/timeline`               | timeline engine                        | ✅ Visual pass   |
| Profile / Settings | `/profile`, `/settings/*` | settings pages                         | ✅ Visual pass   |

## Mock → Live replacement status

| Figma mock                   | Replacement                                        | Status  |
| ---------------------------- | -------------------------------------------------- | ------- |
| Home greeting + status       | `briefing.greeting` + first name + attention count | ✅ Live |
| Home AI briefing card        | `briefing.todaySummary`                            | ✅ Live |
| Home family switcher         | `useFamilyContext` members + selection             | ✅ Live |
| Home needs attention         | `briefing.attentionItems` filtered by member       | ✅ Live |
| Home today schedule          | `briefing.timelinePreview` (today's events)        | ✅ Live |
| Home explore shortcuts       | Health / Docs / Ask routes                         | ✅ Live |
| Ask prompts/recents          | `useAskChronicle` + dynamic suggestions            | ✅ Live |
| Ask conversation             | `ConversationThread`                               | ✅ Live |
| More profile                 | `useAuth` + `useUser`                              | ✅ Live |
| More modules                 | `MODULE_REGISTRY` + routes                         | ✅ Live |
| Mail emails                  | shared mock (connector pending)                    | ⏳ Mock |
| Tasks list                   | shared mock (service pending)                      | ⏳ Mock |
| Health in More "Coming Soon" | enabled → `/health`                                | ✅ Live |

## Integration phases

1. ✅ Screen mapping (this doc)
2. ✅ Figma shell + navigation
3. ✅ Shared providers (existing `AppProviders`)
4. ✅ Home, Ask, More wired
5. ✅ Health screens (Figma visual pass on existing pages)
6. ✅ Documents, Timeline visual pass
7. ✅ Family, Profile/Settings visual pass
8. ✅ Delete obsolete pre-Figma home/command-center UI
