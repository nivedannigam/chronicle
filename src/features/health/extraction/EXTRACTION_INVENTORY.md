# Lab report extraction — corpus inventory

Source zip: `drive-download-20260801T110514Z-1-001.zip` (extracted to `_fixtures/lab-reports/`, gitignored).

## Layout-based extractors (not per-vendor)

All strategies run on every report; results merge by confidence + canonical dedupe.

| Layout              | File                                  | Handles                                                   |
| ------------------- | ------------------------------------- | --------------------------------------------------------- |
| `ocr-table`         | `layouts/ocr-table.layout.ts`         | Structured OCR table cells                                |
| `vertical-block`    | `layouts/vertical-block.layout.ts`    | Thyrocare Google OCR mashed/vertical blocks               |
| `spaced-horizontal` | `layouts/spaced-horizontal.layout.ts` | Apollo, Metropolis, clean Qtest (`NAME value unit range`) |
| `glued-horizontal`  | `layouts/glued-horizontal.layout.ts`  | Qtest/Svasth glued rows (`Name:valueunitrange`)           |
| `loose-text`        | `layouts/loose-text.layout.ts`        | Wide whitespace column fallback                           |

Registry: `layouts/layout-extractor.registry.ts` → `extractMetricsFromLayouts()`

## Corpus coverage (pdf-parse text, integration test)

| File                               | Expected layouts  | Notes                                                  |
| ---------------------------------- | ----------------- | ------------------------------------------------------ |
| March 2026 - Thyrocare Test 2.pdf  | vertical-block    | Primary production fixture (~72+ metrics)              |
| 2023 Feb - Complete Blood Test.pdf | vertical-block    | Aarogyam panel (~48 metrics)                           |
| Iron Test 2026.pdf                 | glued-horizontal  | Qtest iron panel (5 metrics)                           |
| 2024 Oct - Partial Checkup.pdf     | spaced-horizontal | Metropolis LFT (~23 metrics)                           |
| Jan/Feb 2026, 2025 Jun full body   | glued-horizontal  | Qtest/Svasth (~24–29 metrics)                          |
| 2022 Jan Apollo CBC                | glued-horizontal  | Partial (~21 metrics)                                  |
| 2023 - 2026 Health Summary.pdf     | —                 | Dashboard summary (non-lab)                            |
| 2026 March ECG.pdf / Feb TMT       | —                 | Report-type gate, no lab metrics                       |
| 2023 Feb Serum Electrolytes.pdf    | —                 | Summary-only in pdf-parse; may work via production OCR |

## Fixtures (committed, redacted)

- `fixtures/thyrocare-combo-march-2026.ocr.txt` — Google OCR text
- `fixtures/thyrocare-aarogyam-2023-snippet.ocr.txt` — partial 2023 panel

## Live verification

Re-process `March 2026 - Thyrocare Test 2.pdf` after deploy so `health_reports.parsed_data.metrics > 0` and status reaches `completed`.
