# Chronicle OS

Chronicle OS is the **experience layer** that sits above every module. Users interact with one intelligent personal operating system — not separate Health, Insurance, or Documents apps.

## Architecture

```
User
  ↓
Chronicle OS (src/features/os/)
  ├── Home dashboard       ← Life Score, Daily Brief, Upcoming, Activity
  ├── Global Search        ← Grouped results across all domains
  ├── Global Ask           ← /ask (existing intelligence pipeline)
  ├── Global Timeline      ← /timeline (all module providers)
  ├── Library              ← /documents (canonical document hub)
  ├── People               ← FamilyContext + /profile/family
  └── Notifications        ← /notifications (platform contributors)
  ↓
Core Platform (src/core/platform/)
  ↓
Domain Modules (Health, Insurance, Documents, …)
```

## Key services

| Service                     | Purpose                                         |
| --------------------------- | ----------------------------------------------- |
| `life-score.service.ts`     | Intelligent life summary — not a simple average |
| `daily-brief.service.ts`    | "What do I need to know today?"                 |
| `upcoming.service.ts`       | Renewals, expirations, recommendations          |
| `os-home.service.ts`        | Composes the home dashboard                     |
| `grouped-search.service.ts` | Documents · Modules · Timeline · People · Ask   |

## Navigation

Bottom nav reflects OS-first thinking:

**Home · Library · Ask · Timeline · You**

Module routes (`/health`, `/insurance`) remain fully functional — accessed via Life Score tiles, search, and More.

## Module boundaries

OS services **read** from domain knowledge objects. They never contain domain business rules.
