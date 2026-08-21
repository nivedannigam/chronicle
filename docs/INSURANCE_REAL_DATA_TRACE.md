# Insurance Real Data Trace (P1-02)

Read-only trace of all 10 production registry rows classified `insurance_policy`, captured before P1-02 materialization fixes.

## Summary

| Metric                             | Count |
| ---------------------------------- | ----: |
| Registry `insurance_policy` PDFs   |    10 |
| Materialized `insurance_documents` |     3 |
| Materialized `insurance_policies`  |     2 |
| Not materialized                   |     7 |
| Document without policy            |     1 |

### By folder-derived category (source of truth: folder path)

| Category        | Registry files |
| --------------- | -------------: |
| Health          |              5 |
| Home            |              2 |
| Term / Life     |              1 |
| Vehicle / Motor |              2 |

### By materialized policy type (before fix)

| Policy type | Count |
| ----------- | ----: |
| motor       |     2 |
| health      |     0 |
| life_term   |     0 |
| home        |     0 |

## Root cause (pre-fix)

1. **G — Import queue / materialization gap**: 7 registry rows remained at `import_status: discovered` with no `insurance_document_id`. Discovery succeeded; import sync either never ran or aborted mid-batch.
2. **G — Batch failure propagation**: `importDiscoveredInsuranceFiles` had no per-row error isolation — one failure could block subsequent imports.
3. **H — Stuck processing**: `HDFC Term Insurance.pdf` had an insurance document in `processing` with no linked policy (partial import).
4. **C/D — Category not the primary blocker for motor**: The 2 motor policies materialized correctly when import completed; non-motor categories were never imported, not misclassified at registry level.
5. **Folder path is available and correct** for all 10 files (`Insurance/Health`, `Insurance/Home`, `Insurance/Life`, `Insurance/Vehicle`).

## Per-document trace

| #   | File                                      | Folder            | Expected category      | Registry import | Insurance doc | Policy  | Failure mode                                   |
| --- | ----------------------------------------- | ----------------- | ---------------------- | --------------- | ------------- | ------- | ---------------------------------------------- |
| 1   | Amethyst - SBI General Home insurance.pdf | Insurance/Home    | Home                   | discovered      | missing       | missing | **G** not materialized                         |
| 2   | Citi Insurance FAQ.pdf                    | Insurance/Health  | Health (informational) | discovered      | missing       | missing | **G** not materialized; **I** FAQ not a policy |
| 3   | HDFC - Health Insurance                   | Insurance/Health  | Health                 | discovered      | missing       | missing | **G** not materialized                         |
| 4   | HDFC Term Insurance.pdf                   | Insurance/Life    | Term / Life            | completed       | processing    | missing | **H/E** stuck processing, no policy            |
| 5   | IndusInd - XEV 9E Insurance.pdf           | Insurance/Vehicle | Motor                  | completed       | completed     | motor   | OK                                             |
| 6   | Kotak - Super Top Up.pdf                  | Insurance/Health  | Health                 | discovered      | missing       | missing | **G** not materialized                         |
| 7   | Liviano - SBI General Home insurance.pdf  | Insurance/Home    | Home                   | discovered      | missing       | missing | **G** not materialized                         |
| 8   | Niva Bupa - Health Insurance.PDF          | Insurance/Health  | Health                 | discovered      | missing       | missing | **G** not materialized                         |
| 9   | Niva Bupa - Super Top Up.pdf              | Insurance/Health  | Health                 | discovered      | missing       | missing | **G** not materialized                         |
| 10  | Reliance - XEV 9E Insurance.pdf           | Insurance/Vehicle | Motor                  | completed       | completed     | motor   | OK                                             |

## Classification chain (verified)

```
Drive folder (Insurance root, recursive)
  → registry discovery_category = insurance_policy
  → folder_path segment (Health/Life/Vehicle/Home)
  → resolveInsuranceCategoryHint (folder > filename)
  → extractRegistryDocumentForDomain (AI when configured, else deterministic fallback)
  → insurance_documents + insurance_policies
  → federated Library via insurance-module.provider
```

Folder path is present on all 10 registry rows. Filename alone is **not** used when folder path provides a stronger signal.

## Closeout state (2026-08-21)

| Metric                      | Before P1-02 | After materialization | After orphan cleanup |
| --------------------------- | -----------: | --------------------: | -------------------: |
| Registry PDFs               |           10 |                    10 |                   10 |
| insurance_documents         |            3 |                    10 |                   10 |
| insurance_policies          |            2 |                    11 |                **9** |
| Health policies             |            0 |                     6 |                **4** |
| Term/Life                   |            0 |                     1 |                    1 |
| Home                        |            0 |                     2 |                    2 |
| Motor                       |            2 |                     2 |                    2 |
| Needs review (FAQ)          |            0 |                     1 |                    1 |
| Orphan policies             |            0 |                     2 |                **0** |
| Federated Library insurance |            5 |                    21 |               **19** |

Orphan cleanup details: [`INSURANCE_ORPHAN_CLEANUP.md`](INSURANCE_ORPHAN_CLEANUP.md)

Idempotency (two consecutive syncs post-cleanup): 0 new documents, 0 new policies, 0 duplicates.

## Post-fix production state (2026-08-21)

| Metric                           | Before |         After |
| -------------------------------- | -----: | ------------: |
| Registry `insurance_policy` PDFs |     10 |            10 |
| `insurance_documents`            |      3 |            10 |
| `insurance_policies`             |      2 |           11* |
| Health policies                  |      0 |            6* |
| Term / Life policies             |      0 |             1 |
| Home policies                    |      0 |             2 |
| Motor policies                   |      2 | 2 (preserved) |
| Federated Library insurance rows |      5 |            21 |

\*Policy count includes 2 orphaned health-typed duplicates for home documents created during the first materialization pass (before folder-path priority fix). Canonical home policies exist; orphans flagged for P2 cleanup.

| Document               | Final status                   |
| ---------------------- | ------------------------------ |
| All 9 policy PDFs      | `completed`                    |
| Citi Insurance FAQ.pdf | `needs_review` (informational) |

## Dry-run plan (post-fix, expected actions)

| Action             | Expected count | Files                                            |
| ------------------ | -------------: | ------------------------------------------------ |
| import_and_process |              7 | All discovered rows + FAQ (flagged needs_review) |
| reprocess_stuck    |              1 | HDFC Term Insurance.pdf                          |
| skip_existing      |              2 | IndusInd + Reliance motor (preserve)             |

Expected post-materialization (assuming deterministic/AI extraction):

| Category    | Expected policies |
| ----------- | ----------------: |
| Health      | 4 (excluding FAQ) |
| Term / Life |                 1 |
| Home        |                 2 |
| Motor       |     2 (unchanged) |

FAQ (`Citi Insurance FAQ.pdf`) → insurance document with `needs_review`, no policy.

## Member ownership

All registry rows share the same `family_member_id` (account owner assignment from Insurance root folder). No filename-based member inference observed.

## Notes

- Drive modified/upload dates are **not** used as policy dates.
- Existing motor policies must not be duplicated on re-sync (stable dedupe key: insurer + policy number).
- Sensitive identifiers remain masked in validation output; policy numbers are not exposed in UI cards/search.
