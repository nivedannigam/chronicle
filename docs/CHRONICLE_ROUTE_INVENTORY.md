# Chronicle Route Inventory

**Audit date:** 2026-08-21  
**Scope:** All application routes from router, navigation, layouts, lazy imports, redirects, dev-only routes  
**Method:** Code review of `src/constants/routes.ts`, `src/router.tsx`, module layouts, `e2e/chronicle/route-catalog.ts`  
**Validation:** CODE-REVIEW ONLY (Playwright catalog cross-checked; not every route manually browsed)

---

## Summary

| Metric                           | Count                             |
| -------------------------------- | --------------------------------- |
| `ROUTES` keys defined            | 103                               |
| Routes registered in router      | 103                               |
| Orphan route constants           | 0                                 |
| Playwright route contracts       | 35                                |
| Bottom-nav primary routes        | 5                                 |
| Module hub cards (routable)      | 6 (+ Personal)                    |
| Coming-soon hub cards (no route) | 3 (Travel, Education, Employment) |

---

## Route Records

Legend: **Nav** = persistent primary navigation entry. **PW** = in Playwright `CHRONICLE_ROUTE_CONTRACTS`. **Dup?** = duplicate/redundant surface.

### Shell & Platform

| Route            | Module   | Purpose                          | Nav         | Dup?      | Mobile  | Empty   | Loading | Error   | QA  | Screenshot |
| ---------------- | -------- | -------------------------------- | ----------- | --------- | ------- | ------- | ------- | ------- | --- | ---------- |
| `/`              | Shell    | Redirect → `/home`               | No          | No        | Yes     | N/A     | N/A     | N/A     | No  | No         |
| `/login`         | Auth     | Sign in                          | No          | No        | Yes     | N/A     | Partial | Yes     | No  | No         |
| `/auth/callback` | Auth     | OAuth callback                   | No          | No        | Yes     | N/A     | Yes     | Yes     | No  | No         |
| `/home`          | Home     | Dashboard, activity summary      | Bottom      | No        | Yes     | Yes     | Yes     | Partial | Yes | Yes        |
| `/home/activity` | Home     | Redirect → `/timeline`           | No          | REDUNDANT | Yes     | N/A     | N/A     | N/A     | No  | No         |
| `/modules`       | Modules  | Module hub                       | Bottom      | No        | Yes     | Yes     | Yes     | Partial | Yes | Yes        |
| `/more`          | Shell    | Redirect → `/modules`            | No          | REDUNDANT | Yes     | N/A     | N/A     | N/A     | No  | No         |
| `/ask`           | Ask      | Universal Ask                    | Bottom      | No        | Yes     | Yes     | Yes     | Partial | Yes | Yes        |
| `/search`        | Search   | Global search                    | Header      | No        | Yes     | Yes     | Yes     | Partial | Yes | No         |
| `/timeline`      | Timeline | Federated life timeline          | Home link   | No        | Yes     | Yes     | Yes     | Partial | Yes | Yes        |
| `/notifications` | Shell    | Notifications inbox              | Home bell   | No        | Yes     | Yes     | Yes     | Partial | No  | No         |
| `/mail`          | Shell    | Mail placeholder                 | **None**    | ORPHAN    | Unknown | Unknown | Unknown | Unknown | No  | No         |
| `/tasks`         | Shell    | Tasks placeholder                | **None**    | ORPHAN    | Unknown | Unknown | Unknown | Unknown | No  | No         |
| `/setup`         | Shell    | First-run setup                  | Profile CTA | No        | Yes     | Yes     | Yes     | Partial | No  | No         |
| `/personal`      | Personal | Personal module (no layout tabs) | Hub card    | No        | Yes     | Partial | Partial | Partial | No  | No         |

### Documents / Library

| Route                             | Module  | Purpose                  | Nav              | Dup? | Mobile | Empty   | Loading | Error   | QA  | Screenshot |
| --------------------------------- | ------- | ------------------------ | ---------------- | ---- | ------ | ------- | ------- | ------- | --- | ---------- |
| `/documents`                      | Library | Documents layout index   | Bottom (Library) | No   | Yes    | Yes     | Yes     | Partial | No  | No         |
| `/documents/library`              | Library | Federated library browse | Docs tab         | No   | Yes    | Yes     | Yes     | Partial | Yes | Yes        |
| `/documents/expiring`             | Library | Expiring documents       | Docs tab         | No   | Yes    | Yes     | Yes     | Partial | No  | No         |
| `/documents/category/:categoryId` | Library | Category drill-down      | No               | No   | Yes    | Yes     | Yes     | Partial | No  | No         |
| `/documents/:documentId`          | Library | Document detail          | No               | No   | Yes    | Partial | Yes     | Partial | No  | No         |

### Profile & Settings

| Route                        | Module     | Purpose                     | Nav            | Dup?      | Mobile  | Empty | Loading | Error   | QA  | Screenshot |
| ---------------------------- | ---------- | --------------------------- | -------------- | --------- | ------- | ----- | ------- | ------- | --- | ---------- |
| `/profile`                   | You        | Profile home                | Bottom         | No        | Yes     | N/A   | Yes     | Partial | Yes | Yes        |
| `/profile/personal`          | You        | Personal info               | Profile menu   | No        | Yes     | N/A   | Yes     | Partial | No  | No         |
| `/profile/family`            | Family     | Family members              | Profile menu   | No        | Yes     | Yes   | Yes     | Partial | Yes | No         |
| `/profile/connections`       | You        | Connected services          | Profile menu   | No        | Yes     | Yes   | Yes     | Partial | No  | No         |
| `/profile/connections/drive` | Connectors | Google Drive                | Profile stat   | No        | Yes     | Yes   | Yes     | Partial | No  | No         |
| `/profile/preferences`       | You        | Preferences                 | Profile menu   | No        | Yes     | N/A   | Yes     | Partial | No  | No         |
| `/profile/security`          | You        | Security & privacy          | Profile menu   | No        | Yes     | N/A   | Yes     | Partial | No  | No         |
| `/profile/advanced`          | You        | Advanced (dev links)        | Profile menu   | No        | Yes     | N/A   | Yes     | Partial | No  | No         |
| `/profile/storage`           | You        | Storage usage               | Profile menu   | No        | Yes     | Yes   | Yes     | Partial | No  | No         |
| `/settings`                  | Shell      | Redirect → `/profile`       | No             | REDUNDANT | Yes     | N/A   | N/A     | N/A     | No  | No         |
| `/settings/notifications`    | You        | Notification prefs          | Profile menu   | No        | Yes     | N/A   | Yes     | Partial | No  | No         |
| `/settings/appearance`       | You        | Theme/appearance            | Profile menu   | No        | Yes     | N/A   | Yes     | Partial | No  | No         |
| `/settings/*` (6 aliases)    | Shell      | Legacy redirects to profile | No             | REDUNDANT | Yes     | N/A   | N/A     | N/A     | No  | No         |
| `/integrations`              | Shell      | Redirect → connections      | No             | REDUNDANT | Yes     | N/A   | N/A     | N/A     | No  | No         |
| `/connectors/google-drive`   | Shell      | Redirect → drive            | No             | REDUNDANT | Yes     | N/A   | N/A     | N/A     | No  | No         |
| `/connectors/debug`          | Dev        | Connector debug             | Advanced (DEV) | No        | Unknown | N/A   | N/A     | N/A     | No  | No         |

### Family

| Route                            | Module | Purpose                      | Nav | Dup?      | Mobile | Empty | Loading | Error   | QA  | Screenshot |
| -------------------------------- | ------ | ---------------------------- | --- | --------- | ------ | ----- | ------- | ------- | --- | ---------- |
| `/family`                        | Family | Redirect → `/profile/family` | No  | REDUNDANT | Yes    | N/A   | N/A     | N/A     | No  | No         |
| `/family/members/new`            | Family | Add member                   | No  | No        | Yes    | N/A   | Yes     | Partial | No  | No         |
| `/family/members/:memberId`      | Family | Member detail                | No  | No        | Yes    | Yes   | Yes     | Partial | No  | No         |
| `/family/members/:memberId/edit` | Family | Edit member                  | No  | No        | Yes    | N/A   | Yes     | Partial | No  | No         |

### Health (reference module)

| Route                                                                                  | Module | Purpose                          | Nav            | Dup?      | Mobile  | Empty   | Loading | Error   | QA  | Screenshot |
| -------------------------------------------------------------------------------------- | ------ | -------------------------------- | -------------- | --------- | ------- | ------- | ------- | ------- | --- | ---------- |
| `/health`                                                                              | Health | Health home                      | Module tab     | No        | Yes     | Yes     | Yes     | Yes     | Yes | Yes        |
| `/health/progress`                                                                     | Health | Progress view                    | Module tab     | No        | Yes     | Yes     | Yes     | Partial | Yes | No         |
| `/health/history`                                                                      | Health | Visit/report history             | Module tab     | No        | Yes     | Yes     | Yes     | Partial | Yes | No         |
| `/health/reports`                                                                      | Health | Reports list                     | Module tab     | No        | Yes     | Yes     | Yes     | Partial | Yes | No         |
| `/health/visits/:visitId`                                                              | Health | Visit detail                     | No             | No        | Yes     | Partial | Yes     | Partial | No  | No         |
| `/health/reports/:reportId`                                                            | Health | Report detail                    | No             | No        | Yes     | Partial | Yes     | Partial | No  | No         |
| `/health/metrics/:metricId`                                                            | Health | Metric timeline                  | No             | No        | Yes     | Partial | Yes     | Partial | No  | No         |
| `/health/settings`                                                                     | Health | Health settings                  | Module tab     | No        | Yes     | Yes     | Yes     | Yes     | Yes | No         |
| `/health/settings/folders`                                                             | Health | Folder assignment                | Settings deep  | No        | Yes     | Yes     | Yes     | Partial | No  | No         |
| `/health/review-documents`                                                             | Health | Import/review center             | Advanced only  | No        | Yes     | Yes     | Yes     | Partial | No  | No         |
| `/health/ask`                                                                          | Ask    | Redirect → `/ask?context=health` | In-page legacy | REDUNDANT | Yes     | N/A     | N/A     | N/A     | Yes | No         |
| `/health/timeline`                                                                     | Health | Redirect → `/health/history`     | No             | REDUNDANT | Yes     | N/A     | N/A     | N/A     | No  | No         |
| `/health/metrics`, `/health/insights`, `/health/validation`, `/health/knowledge-debug` | Health | Redirects → home/settings        | No             | REDUNDANT | Yes     | N/A     | N/A     | N/A     | No  | No         |
| `/health/import*`, `/health/discovery` (5 routes)                                      | Health | Redirects → review-documents     | No             | REDUNDANT | Yes     | N/A     | N/A     | N/A     | No  | No         |
| `/health/reports/:reportId/ocr`                                                        | Dev    | OCR preview                      | DEV only       | No        | Unknown | N/A     | N/A     | N/A     | No  | No         |
| `/health/compare`                                                                      | Dev    | Compare metrics                  | DEV only       | No        | Unknown | N/A     | N/A     | N/A     | No  | No         |

### Insurance

| Route                             | Module    | Purpose                             | Nav            | Dup?             | Mobile | Empty   | Loading | Error   | QA  | Screenshot |
| --------------------------------- | --------- | ----------------------------------- | -------------- | ---------------- | ------ | ------- | ------- | ------- | --- | ---------- |
| `/insurance`                      | Insurance | Insurance home                      | Module tab     | No               | Yes    | Yes     | Yes     | Yes     | Yes | Yes        |
| `/insurance/coverage`             | Insurance | Coverage overview                   | Module tab     | No               | Yes    | Yes     | Yes     | Partial | Yes | No         |
| `/insurance/coverage/:categoryId` | Insurance | Coverage category detail            | No             | No               | Yes    | Partial | Yes     | Partial | No  | No         |
| `/insurance/policies`             | Insurance | Policy list                         | Module tab     | No               | Yes    | Yes     | Yes     | Partial | Yes | No         |
| `/insurance/policies/:policyId`   | Insurance | Policy detail                       | No             | No               | Yes    | Partial | Yes     | Partial | No  | No         |
| `/insurance/claims`               | Insurance | Claims list                         | Module tab     | No               | Yes    | Yes     | Yes     | Partial | Yes | No         |
| `/insurance/claims/:claimId`      | Insurance | Claim detail                        | No             | No               | Yes    | Partial | Yes     | Partial | No  | No         |
| `/insurance/timeline`             | Insurance | Module timeline (not federated)     | Module tab     | **DUP Timeline** | Yes    | Yes     | Yes     | Partial | Yes | No         |
| `/insurance/settings`             | Insurance | Insurance settings                  | Module tab     | No               | Yes    | Yes     | Yes     | Yes     | Yes | No         |
| `/insurance/ask`                  | Ask       | Redirect → `/ask?context=insurance` | In-page legacy | REDUNDANT        | Yes    | N/A     | N/A     | N/A     | Yes | No         |

### Vehicles

| Route                    | Module   | Purpose                            | Nav            | Dup?             | Mobile | Empty   | Loading | Error   | QA               | Screenshot |
| ------------------------ | -------- | ---------------------------------- | -------------- | ---------------- | ------ | ------- | ------- | ------- | ---------------- | ---------- |
| `/vehicles`              | Vehicles | Vehicle home                       | Module tab     | No               | Yes    | Yes     | Yes     | Partial | Yes              | Yes        |
| `/vehicles/timeline`     | Vehicles | Module timeline                    | Module tab     | **DUP Timeline** | Yes    | Yes     | Yes     | Partial | Yes              | No         |
| `/vehicles/settings`     | Vehicles | Vehicle settings                   | Module tab     | No               | Yes    | Yes     | Yes     | Partial | Yes              | No         |
| `/vehicles/:vehicleSlug` | Vehicles | Vehicle detail                     | No             | No               | Yes    | Partial | Yes     | Partial | Yes (QA fixture) | No         |
| `/vehicles/ask`          | Ask      | Redirect → `/ask?context=vehicles` | In-page legacy | REDUNDANT        | Yes    | N/A     | N/A     | N/A     | Yes              | No         |

### Identity

| Route                             | Module   | Purpose              | Nav        | Dup? | Mobile | Empty   | Loading | Error   | QA  | Screenshot |
| --------------------------------- | -------- | -------------------- | ---------- | ---- | ------ | ------- | ------- | ------- | --- | ---------- |
| `/identity`                       | Identity | Identity home        | Module tab | No   | Yes    | Yes     | Yes     | Partial | Yes | Yes        |
| `/identity/settings`              | Identity | Identity settings    | Module tab | No   | Yes    | Yes     | Yes     | Partial | Yes | No         |
| `/identity/members/:memberId`     | Identity | Member identity docs | No         | No   | Yes    | Yes     | Yes     | Partial | No  | No         |
| `/identity/documents/:documentId` | Identity | Identity doc detail  | No         | No   | Yes    | Partial | Yes     | Partial | No  | No         |

### Finance

| Route                              | Module  | Purpose              | Nav            | Dup?            | Mobile | Empty   | Loading | Error   | QA  | Screenshot |
| ---------------------------------- | ------- | -------------------- | -------------- | --------------- | ------ | ------- | ------- | ------- | --- | ---------- |
| `/finance`                         | Finance | Finance home         | Module tab     | No              | Yes    | Yes     | Yes     | Partial | Yes | Yes        |
| `/finance/history`                 | Finance | Finance history      | Home link only | **Missing tab** | Yes    | Yes     | Yes     | Partial | Yes | No         |
| `/finance/history/events/:eventId` | Finance | History event detail | No             | No              | Yes    | Partial | Yes     | Partial | No  | No         |
| `/finance/settings`                | Finance | Finance settings     | Module tab     | No              | Yes    | Yes     | Yes     | Partial | Yes | No         |
| `/finance/documents/:documentId`   | Finance | Finance doc detail   | No             | No              | Yes    | Partial | Yes     | Partial | No  | No         |

### Property

| Route                               | Module   | Purpose              | Nav        | Dup? | Mobile | Empty   | Loading | Error   | QA               | Screenshot |
| ----------------------------------- | -------- | -------------------- | ---------- | ---- | ------ | ------- | ------- | ------- | ---------------- | ---------- |
| `/property`                         | Property | Property home        | Module tab | No   | Yes    | Yes     | Yes     | Partial | Yes              | Yes        |
| `/property/history`                 | Property | Property history     | Module tab | No   | Yes    | Yes     | Yes     | Partial | Yes              | No         |
| `/property/settings`                | Property | Property settings    | Module tab | No   | Yes    | Yes     | Yes     | Partial | Yes              | No         |
| `/property/:propertySlug`           | Property | Property detail      | No         | No   | Yes    | Partial | Yes     | Partial | Yes (QA fixture) | No         |
| `/property/history/events/:eventId` | Property | History event detail | No         | No   | Yes    | Partial | Yes     | Partial | No               | No         |
| `/property/documents/:documentId`   | Property | Property doc detail  | No         | No   | Yes    | Partial | Yes     | Partial | No               | No         |

---

## Orphan Routes

Routes registered but with **no discoverable navigation path**:

| Route               | Classification | Notes                                     |
| ------------------- | -------------- | ----------------------------------------- |
| `/mail`             | ORPHAN         | Page exists; zero UI links in `src/`      |
| `/tasks`            | ORPHAN         | Page exists; zero UI links in `src/`      |
| `/connectors/debug` | DEV ORPHAN     | Only via Profile → Advanced in dev builds |

**Unreachable components (redirected away):**

| Component          | Issue                                     |
| ------------------ | ----------------------------------------- |
| `SettingsDataPage` | `/settings/data` → `/profile/security`    |
| `IntegrationsPage` | Never imported; `/integrations` redirects |

---

## Navigation Bugs

| Issue                                                                 | Evidence                                                                                               | Severity |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| Property missing from `MODULE_ROUTE_PREFIXES`                         | `src/lib/navigation.ts` — browsing `/property/*` highlights **Home** bottom tab instead of **Modules** | P1       |
| Finance `/finance/history` not in FinanceLayout tabs                  | Reachable from home link only                                                                          | P2       |
| Bottom nav "Library" → `/documents` but QA tests `/documents/library` | Label/path mismatch                                                                                    | P2       |
| Stale `health-nav.ts` Ask tab at `/health/ask`                        | Not used by `HealthLayout`; Ask removed from tabs                                                      | P2       |

---

## Playwright Coverage Gap

**In catalog (35):** Shell hubs, module homes, settings, 3 Ask redirects, 2 detail fixtures (`xev-9e`, `pune-home`).

**Not in catalog (~68 routes):** Detail routes, profile sub-routes (except family), `/documents`, `/documents/expiring`, `/notifications`, `/setup`, `/mail`, `/tasks`, `/personal`, most redirects.

---

## Legacy Redirect Chains (high-traffic)

```
/ → /home
/more → /modules
/family → /profile/family
/settings/* → /profile/*
/health/ask → /ask?context=health
/insurance/ask → /ask?context=insurance
/vehicles/ask → /ask?context=vehicles
/health/import* → /health/review-documents
/health/timeline → /health/history
/home/activity → /timeline
```
