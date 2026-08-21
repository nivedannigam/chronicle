# Vehicle Real Data Trace (RD-P1-03)

Read-only trace captured **before** vehicle materialization. Production account state as of P1-03 kickoff.

## Summary

| Metric                                 |                     Value |
| -------------------------------------- | ------------------------: |
| Connected Drive folders                |   Insurance, Medical (×2) |
| **Vehicles root assigned**             |                    **No** |
| `vehicle_folder_assignments`           |                         0 |
| `vehicles`                             |                         0 |
| `vehicle_documents`                    |                         0 |
| Canonical motor insurance policies     |    2 (IndusInd, Reliance) |
| Registry rows under vehicle-like paths | 2 (both Insurance module) |

## Drive structure (connected folders only)

Chronicle currently syncs these Drive roots:

| Folder    | Alias     | Enabled |
| --------- | --------- | ------- |
| Insurance | Insurance | yes     |
| Medical   | Medical   | yes     |
| Medical   | Medical   | yes     |

**No `Vehicles/` root exists in connected Drive folders.** There is no separate Vehicles tree to assign (no RC, PUC, Service, Warranty, or Purchase folders discovered).

Motor insurance PDFs live under the **Insurance** module:

```
Insurance/Vehicle/
  IndusInd - XEV 9E Insurance.pdf
  Reliance - XEV 9E Insurance.pdf
```

These are **not** under `Vehicles/XEV 9e/Insurance/` and must **not** create a vehicle entity on their own.

## Registry trace (vehicle-adjacent rows)

| Source file                     | Folder path       | Discovery category | Target module | Import status | Vehicle document |
| ------------------------------- | ----------------- | ------------------ | ------------- | ------------- | ---------------- |
| IndusInd - XEV 9E Insurance.pdf | Insurance/Vehicle | insurance_policy   | insurance     | completed     | —                |
| Reliance - XEV 9E Insurance.pdf | Insurance/Vehicle | insurance_policy   | insurance     | completed     | —                |

### Pipeline (Insurance path — already materialized)

```
Drive: Insurance/Vehicle/*.pdf
  → connector_document_registry (insurance_policy)
  → insurance_documents
  → insurance_policies (motor, canonical)
  → Insurance Library / Search / Ask
```

### Pipeline (Vehicles path — not started)

```
Drive: Vehicles/<vehicle>/…   ← NOT CONNECTED
  → connector_document_registry (vehicle_document)
  → vehicle_documents
  → vehicles (canonical entity)
  → Vehicle Library / Search / Ask / Home
  → links to existing insurance_policies (reference only, no duplication)
```

## Motor policies (canonical — do not duplicate)

| Insurer  | Product                         | Expiry     | Policy IDs |
| -------- | ------------------------------- | ---------- | ---------- |
| IndusInd | Private Car Policy (Own Damage) | 2027-03-18 | canonical  |
| Reliance | Private Car Policy (Bundled)    | 2028-03-18 | canonical  |

Relationship when a vehicle entity exists:

```
Vehicle (XEV 9e)
  → references insurance_policies.id (IndusInd, Reliance)
  → does NOT copy policies into vehicle tables
```

Linkage uses source document labels (`Reliance - XEV 9E Insurance.pdf`, etc.) and vehicle display name tokens — **only after** a vehicle is created from Vehicles-folder source data.

## Blockers for real materialization

1. **No Vehicles root folder** in Drive sync — user must connect `Vehicles/` once.
2. **No vehicle-domain PDFs** (RC, PUC, service, warranty, purchase) in registry.
3. Per instructions: **do not fabricate** a vehicle from motor insurance policies alone.

## Next step (user action)

Connect a real Drive folder:

```
Vehicles/
  XEV 9e/
    Insurance/
    RC/
    PUC/
    Service/
    Warranty/
```

Recursive discovery from the Vehicles root will pick up nested PDFs without leaf-folder assignment.

## Code readiness (P1-03)

- Per-row import isolation in `vehicle-import-runner.service.ts` (failed rows do not abort batch).
- Folder-path-first classification in `vehicle-document-classifier.ts`.
- Insurance linkage service references canonical motor policies when a vehicle entity exists.
- QA flake fix: explicit `__CHRONICLE_QA__` bootstrap wait in `e2e/chronicle/helpers.ts`.
