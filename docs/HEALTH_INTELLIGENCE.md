# Health Intelligence Layer

Transforms imported reports (`status=completed`, workflow `READY`) into a living health record.

## Data Flow

```
health_reports.parsed_data
  → buildHealthKnowledgeGraph (metric histories, trends, alerts)
  → buildLongitudinalHealthProfile (priority metrics profile)
  → generateLongTermTrendInsights + proactive insights
  → buildHealthSummary + buildHealthCompanionView
  → Dashboard | Timeline | Metrics | Insights | Ask | Search
```

## 1. Health Profile Model

**Service:** `health-profile.service.ts`  
**Type:** `LongitudinalHealthProfile`

Tracks priority metrics with historical values:

Height, Weight, Blood Pressure, HbA1c, Glucose, Vitamin D/B12, Kidney/Liver function, Cholesterol panel, TSH, CBC, Iron, ESR, CRP, plus any other extracted metrics.

Each `ProfileMetricEntry` includes:

- Latest value, unit, status
- Trend direction and label
- Observation count and year span

## 2. Metrics & Trend Series

**Builder:** `health-knowledge-builder.ts`  
**Charts:** `metricHistoriesToTrendSeries` — requires 2+ numeric readings per metric

Metrics are keyed by canonical ID (from `metric-definitions.ts` + `EXTRA_METRICS`).

## 3. Timeline

**Classifier:** `report-type.classifier.ts`

Each completed report becomes a classified timeline event:

| Kind             | Example        |
| ---------------- | -------------- |
| `annual_checkup` | Annual Checkup |
| `blood_test`     | Blood Test     |
| `ecg`            | ECG            |
| `radiology`      | Radiology Scan |
| `vitamin_test`   | Vitamin Test   |
| `health_summary` | Health Summary |

Metric findings and improvements add secondary timeline events.

## 4. Trends

**Engine:** `trend.engine.ts` — direction: improving / stable / declining / rapid_change

**UI:** `TrendChart`, `MetricMiniChart`, `trendHighlights` in companion view

Highlights classify metrics as Improving, Stable, or Needs Attention — never isolated values alone.

## 5. Insights

**Engines:**

- `long-term-trend.engine.ts` — multi-year narratives ("Vitamin D has steadily improved over the last three years")
- `health-insights.engine.ts` — change detection, scorecard, doctor discussion
- `insights.engine.ts` — graph-level derived insights

## 6. Health Summary

**Service:** `health-summary.service.ts`

Continuously updated summary with:

- Headline (overall status)
- Bullets (metrics needing attention, improvements, new findings)
- `overallStatus`: stable | improving | needs_attention | mixed

Surfaced via `companion.healthSummary` and `companion.narrative`.

## 7. AI Context

**Retriever:** `health-knowledge-retriever.ts`

Ask Chronicle receives:

- Longitudinal profile summary
- Reports, metrics, timelines, trends
- Insights and alerts
- Semantic memory enrichment

**Provider:** `health-knowledge.provider.ts` — search by metric, doctor, hospital, report type, OCR text

## 8. Search

Global search indexes completed reports by:

- Report title and type
- Hospital / laboratory
- Doctor name
- Metric names and values
- OCR extracted text

## Validation Checklist

With multiple historical reports imported:

- [ ] Timeline shows chronological classified events
- [ ] Metrics page shows grouped trends with 2+ data points
- [ ] Insights include long-term trend narratives
- [ ] Dashboard summary reflects imported data
- [ ] Ask Chronicle answers using metric history
- [ ] Search finds reports by doctor, hospital, metric

## Critical Dependency

All intelligence surfaces require **`parsed_data.metrics[]` non-empty** on completed reports. Empty OCR/extraction = empty dashboard regardless of workflow READY.
