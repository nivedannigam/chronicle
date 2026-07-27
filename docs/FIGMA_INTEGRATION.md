# Figma ↔ Chronicle Integration Map

## Architecture

| Layer                             | Source                                   | Location        |
| --------------------------------- | ---------------------------------------- | --------------- |
| UI shell, screens, design system  | Figma Make (`_figma-import/src/App.tsx`) | `src/ui/figma/` |
| Auth, data, AI, health, documents | Chronicle platform                       | `src/features/` |

## Bottom navigation (Figma source of truth)

| Tab   | Route    | Figma screen  | Backend hook/service                               |
| ----- | -------- | ------------- | -------------------------------------------------- |
| Home  | `/home`  | `HomeScreen`  | `useCommandCenter`, `useOnboarding`                |
| Ask   | `/ask`   | `AskScreen`   | `useAskChronicle`                                  |
| Mail  | `/mail`  | `MailScreen`  | `mail/constants/mock-data` → future connector      |
| Tasks | `/tasks` | `TasksScreen` | `tasks/constants/mock-data` → future tasks service |
| More  | `/more`  | `MoreScreen`  | `useAuth`, `useUser`, `MODULE_REGISTRY`            |

## Secondary routes (via More / Home, not in tab bar)

| Screen             | Route                     | Backend                                | Figma UI       |
| ------------------ | ------------------------- | -------------------------------------- | -------------- |
| Health Overview    | `/health`                 | `useHealthCompanion`                   | ✅ Visual pass |
| Health Reports     | `/health/reports`         | `useHealthCompanion`                   | ✅ Visual pass |
| Health Metrics     | `/health/metrics`         | `useHealthCompanion`                   | ✅ Visual pass |
| Health Timeline    | `/health/timeline`        | `useHealthCompanion`                   | ✅ Visual pass |
| Health Insights    | `/health/insights`        | `useHealthCompanion`                   | ✅ Visual pass |
| Health Setup       | `/health/settings`        | `useHealthMemberSetup`, import journey | ✅ Visual pass |
| Report detail      | `/health/reports/:id`     | `useHealthReportDetail`                | ✅ Visual pass |
| Documents          | `/documents`              | `useDocuments`                         | ✅ Visual pass |
| Document detail    | `/documents/:id`          | `getDocument`                          | ✅ Visual pass |
| Family             | `/family`                 | `useFamilyContext`                     | ✅ Visual pass |
| Life Timeline      | `/timeline`               | timeline engine                        | ✅ Visual pass |
| Profile / Settings | `/profile`, `/settings/*` | settings pages                         | ✅ Visual pass |

## Mock → Live replacement status

| Figma mock                   | Replacement                             | Status  |
| ---------------------------- | --------------------------------------- | ------- |
| Home `brief`                 | `briefing.attentionItems`               | ✅ Live |
| Home `world`                 | health snapshot + documents + family    | ✅ Live |
| Home `timeline`              | `briefing.timelinePreview`              | ✅ Live |
| Home greeting                | `briefing.greeting` + name              | ✅ Live |
| Ask prompts/recents          | `useAskChronicle` + dynamic suggestions | ✅ Live |
| Ask conversation             | `ConversationThread`                    | ✅ Live |
| More profile                 | `useAuth` + `useUser`                   | ✅ Live |
| More modules                 | `MODULE_REGISTRY` + routes              | ✅ Live |
| Mail emails                  | shared mock (connector pending)         | ⏳ Mock |
| Tasks list                   | shared mock (service pending)           | ⏳ Mock |
| Health in More "Coming Soon" | enabled → `/health`                     | ✅ Live |

## Integration phases

1. ✅ Screen mapping (this doc)
2. ✅ Figma shell + navigation
3. ✅ Shared providers (existing `AppProviders`)
4. ✅ Home, Ask, More wired
5. ✅ Health screens (Figma visual pass on existing pages)
6. ✅ Documents, Timeline visual pass
7. ✅ Family, Profile/Settings visual pass
8. ✅ Delete obsolete pre-Figma home/command-center UI
