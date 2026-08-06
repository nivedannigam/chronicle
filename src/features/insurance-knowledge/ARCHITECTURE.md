# Insurance Knowledge Architecture

Insurance Knowledge is the **single source of truth** for the Insurance module. Every feature — Home, Coverage, Policies, Claims, Ask, Notifications, Renewals — reads from one canonical `InsuranceKnowledge` object.

## Two-layer model

| Layer         | Type                      | Purpose                                                        |
| ------------- | ------------------------- | -------------------------------------------------------------- |
| **Graph**     | `InsuranceKnowledgeGraph` | Longitudinal portfolio view, relationships, category snapshots |
| **Canonical** | `InsuranceKnowledge`      | SSOT for all consumers — UI, Ask, notifications                |

## Pipeline

```
Google Drive PDFs
  → AI Extraction
  → Structured records (policies, coverages, claims, …)
  → InsuranceKnowledgeProvider.getKnowledge()
  → InsuranceKnowledge
```

## Canonical object

`InsuranceKnowledge` contains:

- Policies (ranked, partitioned: active / expiring / lapsed)
- Coverages, Claims, Members, Nominees, Insurers
- Premiums, Renewals, Benefits, Exclusions
- Documents (evidence refs)
- Relationships (Policy → covers → Member, etc.)
- Coverage gaps, category aggregation
- Protection score, timeline, insights, recommendations
- Confidence, limitations, sources, summary

## Builder flow

1. `fetchRawData()` — policies, documents, family members
2. `filterRawDataForMember()` — member scope
3. `mergeInsuranceRecords()` — dedupe policies by insurer + policy number
4. `buildInsuranceKnowledgeGraph()` — histories, categories, relationships, gaps
5. `rankInsurancePolicies()` — priority scoring
6. Engines — timeline, limitations, insights, recommendations, confidence
7. `InsuranceKnowledge` assembly

## Relationship types

- Policy **covers** InsuredMember
- Policy **issued_by** Insurer
- Policy **contains** Coverage / Benefit / Exclusion
- Policy **has** Claim / Document
- Policy **belongs_to** Category
- Policy **names** Nominee

## No duplicate models

Do not create feature-specific policy representations. Import from `@/features/insurance-knowledge`.
