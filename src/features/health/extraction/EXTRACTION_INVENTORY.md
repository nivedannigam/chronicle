# Thyrocare extraction — corpus inventory

Source zip: `drive-download-20260801T110514Z-1-001.zip` (extracted to `_fixtures/lab-reports/`, gitignored).

| File                                       | Type               | Vendor                   | Notes                                                 |
| ------------------------------------------ | ------------------ | ------------------------ | ----------------------------------------------------- |
| March 2026 - Thyrocare Test 2.pdf          | Lab combo (~12 pp) | Thyrocare (Sohrabh Hall) | Primary fixture; Google OCR vertical/mashed layout    |
| 2023 Feb - Complete Blood Test.pdf         | Lab panel (~16 pp) | Thyrocare                | Aarogyam summary + `TEST NAME OBSERVATION UNITS` rows |
| 2023 Feb - Serum Electrolytes.pdf          | Lab panel (~3 pp)  | Thyrocare                | Reversed `value tech unit name` rows                  |
| 2022 Jan - Complete Blood Test.pdf         | Lab                | Unknown                  | Additional CBC sample                                 |
| 2024 Mar - Full Body Checkup.pdf           | Lab                | Unknown                  | Full body                                             |
| 2024 Oct - Partial Checkup.pdf             | Lab                | Unknown                  | Partial panel                                         |
| 2025 Jun - Full Body Checkup.pdf           | Lab                | Unknown                  | Full body                                             |
| Feb 2026.pdf / Jan 2026.pdf                | Lab                | Unknown                  | Recent reports                                        |
| Iron Test 2026.pdf / CEA Test Feb 2026.pdf | Lab                | Unknown                  | Single panels                                         |
| 2023 - 2026 Health Summary.pdf             | Summary            | —                        | Non-metric summary doc                                |
| 2026 March ECG.pdf                         | ECG                | —                        | Metricless-allowed type                               |
| Feb 2026 - TMT.pdf                         | Cardiac test       | —                        | Non-lab                                               |
| Feb 2026 Company plan.pdf                  | Non-medical        | —                        | Skip (34 MB)                                          |
| IMG_8104.jpg / IMG_8105.jpg                | Image              | —                        | Photo uploads                                         |

## Layout variants

1. **Google OCR combo (2026)** — Mashed rows: `< 200mg/dL 155` + `PHOTOMETRYTOTAL CHOLESTEROL`; urine/CBC vertical blocks; immuno `OD ratio 0.23C.M.I.A…`
2. **Aarogyam (2023)** — Summary pages + `TEST NAME OBSERVATION UNITS REFERENCE RANGE` horizontal rows
3. **Electrolytes (2023)** — `143 I.S.E mmol/l SODIUM` (value-first)

## Extractor

`src/features/health/extraction/vendors/thyrocare-text.extractor.ts` — optimized for variant **1** (production OCR). Variant 2/3 partially covered via observation/electrolyte row parsers.

## Fixture (committed, redacted)

- `fixtures/thyrocare-combo-march-2026.ocr.txt` — Google OCR text, ~82 metrics extracted in tests
- `fixtures/thyrocare-aarogyam-2023-snippet.ocr.txt` — partial 2023 panel

## Before / after (March 2026 combo)

| Metric                  | Before | After (unit tests)                 |
| ----------------------- | ------ | ---------------------------------- |
| `parsed_data.metrics`   | 0      | 82+                                |
| HEMOGLOBIN              | —      | ✓                                  |
| TOTAL CHOLESTEROL / LDL | —      | ✓                                  |
| COTININE (NEGATIVE)     | —      | ✓                                  |
| HBsAg                   | —      | ✓ (as HEPATITIS B SURFACE ANTIGEN) |

Re-process the live report after deploy to populate `health_metrics` and complete import journey.
