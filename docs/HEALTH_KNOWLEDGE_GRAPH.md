# Health Knowledge Graph

Chronicle's Health Knowledge Graph transforms report-centric data into a person-centric health intelligence layer. It merges mock and uploaded reports, links identical metrics via normalization, builds longitudinal histories, and computes deterministic trends and insights — without LLMs or medical advice.

## Architecture

```
Person
  └── PersonHealthProfile
        ├── CategorySnapshots (Heart, Liver, Kidney, …)
        ├── HealthMetricHistory[] (per-metric timelines)
        ├── DerivedHealthInsight[]
        ├── HealthAlert[]
        └── MetricRelationship[]
```

### Data flow

```
Mock Reports + Uploaded Reports (parsed_data)
        ↓
HealthKnowledgeBuilder (merge + normalize + dedupe)
        ↓
Engines (Trend, Baseline, Insights, Relationships)
        ↓
HealthKnowledgeCache (in-memory, keyed by person + source hash)
        ↓
HealthKnowledgeService → Dashboard, Trends, Debug, future AI modules
```

## Folder structure

```
src/features/health-knowledge/
├── types/health-knowledge.types.ts   # Core domain models
├── graph/
│   ├── metric-categories.ts        # Category definitions + metric catalog
│   └── metric-relationships.ts     # Deterministic metric links
├── engines/
│   ├── trend.engine.ts             # Improving / Stable / Declining / Rapid Change
│   ├── baseline.engine.ts          # Re-exports baseline helpers
│   ├── insights.engine.ts          # Derived insights (no AI)
│   └── relationship.engine.ts      # Relationship lookups
├── services/
│   ├── health-knowledge-builder.ts # Graph construction
│   ├── health-knowledge-cache.ts   # Build-once cache
│   └── health-knowledge.service.ts # Public API
├── hooks/useHealthKnowledge.ts
├── pages/
│   ├── HealthKnowledgeDebugPage.tsx
│   └── HealthMetricTimelinePage.tsx
└── index.ts
```

## Core models

| Model                    | Purpose                                                 |
| ------------------------ | ------------------------------------------------------- |
| `PersonHealthProfile`    | Root graph node for one person                          |
| `HealthMetricDefinition` | Canonical metric identity + aliases                     |
| `HealthMetricHistory`    | Longitudinal timeline for one metric                    |
| `HealthObservation`      | Single reading linked to a report                       |
| `HealthTrend`            | Direction + change percent + description                |
| `MetricBaseline`         | Latest, best, worst, average, first/last                |
| `MetricRelationship`     | Structured links (e.g. Creatinine → eGFR)               |
| `MetricCategory`         | Heart, Liver, Kidney, Diabetes, Thyroid, Vitamin, Blood |
| `HealthAlert`            | Abnormal latest values (informational only)             |

## Metric timeline

Each normalized metric maintains an independent sorted history:

```
Vitamin D: 18 (Jan 2024) → 24 (Jun 2024) → 31 (Jan 2025) → 35 (Jul 2026)
```

Observations retain `reportId` so UI can navigate to the originating report.

Routes:

- `/health/metrics/:metricId` — metric timeline drill-down
- `/health/knowledge-debug` — developer visualization (dev only)

## Trend engine

Deterministic classification from first → last numeric observation:

- **Improving** — favorable direction (context-aware for lower-is-better metrics like LDL, HbA1c)
- **Stable** — change within 5%
- **Declining** — unfavorable direction
- **Rapid Change** — change ≥ 20%
- **Unknown** — fewer than 2 numeric points

## Baseline engine

Per metric history:

- Latest / Best / Worst / Average / Highest / Lowest
- First Recorded / Last Recorded
- Human-readable `latestValueLabel`

## Derived insights

Computed without AI:

- Abnormal report count
- Improving metric count
- Metrics needing attention
- Longest improving / worsening metric
- Average health trend across scored metrics

## Caching

The graph is built once per `(personId, sourceKey)` where `sourceKey` hashes mock report IDs/dates and uploaded report IDs/status/timestamps.

- Cache hit → return immediately
- Cache miss → build, store, return
- Invalidation → `invalidateHealthKnowledgeCache(userId)` after report processing completes

## UI integration

| Surface                  | Source                                      |
| ------------------------ | ------------------------------------------- |
| Dashboard snapshot cards | `HealthKnowledgeService.getSnapshots()`     |
| Dashboard insights       | `HealthKnowledgeService.getInsights()`      |
| Trends page              | `HealthKnowledgeService.getTrendSeries()`   |
| Metric timeline          | `HealthKnowledgeService.getMetricHistory()` |

Snapshot cards show: **Latest Value**, **Trend**, **History Count**, **Last Updated**.

## Future AI consumption

Future Ask Chronicle / AI modules should consume the graph through `HealthKnowledgeService.getGraphForUser()` rather than reading raw reports:

```typescript
const graph = healthKnowledgeService.getGraphForUser(userId, uploadedReports)
const profile = graph.profile

// Structured context for reasoning
profile.metricHistories // longitudinal data
profile.relationships // metric graph edges
profile.insights // pre-computed deterministic facts
profile.alerts // attention flags (not diagnoses)
graph.metricDefinitions // normalization catalog
```

### Reusable pattern for other domains

The same layering applies to Finance, Travel, Mail, Photos, and Documents:

1. **Domain types** — entities, observations, relationships
2. **Graph catalog** — categories + canonical definitions
3. **Builder** — merge sources, normalize, dedupe
4. **Engines** — trends, baselines, insights (deterministic)
5. **Cache** — build once, invalidate on source change
6. **Service** — stable API for UI and future AI

## Rules

- No LLM in this layer
- No diagnosis or medical recommendations
- No cloud AI
- Deterministic data modelling only
