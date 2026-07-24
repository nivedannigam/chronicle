# Health Metric Extraction

Chronicle converts uploaded laboratory PDFs into structured health metrics using a deterministic pipeline. No LLM is used.

## Pipeline

```
PDF Upload
  → OCR Provider (Google Document AI via Edge Function)
  → Health Metadata Parser
  → Metric Extraction Engine
  → Reference Range Engine
  → Normalization Engine
  → HealthReport stored in Supabase parsed_data
  → Dashboard + Timeline + Knowledge Layer
```

## Adding Support for a New Report Format

### 1. Extend OCR templates (development / fallback)

Update `src/features/document-intelligence/ocr/providers/mock-ocr.templates.ts` with a template that mirrors the real report layout:

- Header lines for laboratory metadata
- Metric rows with columns: Test Name, Result, Reference Range, Unit

Filename heuristics in `resolveMockTemplate()` route uploads to the correct template during local development.

### 2. Add metric definitions

Edit `src/features/document-intelligence/extraction/metric-definitions.ts`:

```typescript
{
  canonicalId: 'new-metric',
  displayName: 'Display Name',
  aliases: ['alias 1', 'alias 2'],
  category: 'liver',
  defaultUnit: 'U/L',
}
```

Aliases power the normalization engine. Add every spelling variant seen in lab reports.

### 3. Add report type detection

Edit `src/features/document-intelligence/extraction/health-metadata.parser.ts` and add a rule to `REPORT_TYPE_RULES` if the report should map to a dashboard category.

### 4. Validate table extraction

The metric extractor reads OCR tables first, then falls back to text regex. Ensure Google Document AI returns tables with header row:

| Test Name | Result | Reference Range | Unit |

If a lab uses a different column order, update `extractRowsFromTables()` in `metric-extraction.engine.ts`.

### 5. Add sample fixture + test

Add a fixture in `src/features/document-intelligence/extraction/__fixtures__/` and a test case in `metric-extraction.test.ts`.

Run:

```bash
pnpm test
```

### 6. Production OCR

Deploy the edge function:

```bash
supabase functions deploy document-ocr
```

Set secrets:

```bash
supabase secrets set GOOGLE_DOCUMENT_AI_PROJECT_ID=...
supabase secrets set GOOGLE_DOCUMENT_AI_PROCESSOR_ID=...
supabase secrets set GOOGLE_DOCUMENT_AI_LOCATION=us
supabase secrets set GOOGLE_DOCUMENT_AI_ACCESS_TOKEN=...
```

Set client env:

```env
VITE_OCR_PROVIDER=google
```

## Supported Panels (sample templates)

| Panel         | Filename hint            | Key metrics                              |
| ------------- | ------------------------ | ---------------------------------------- |
| CBC           | `cbc`, `blood count`     | Hemoglobin, WBC, Platelets               |
| LFT           | `lft`, `liver`           | ALT, AST, Bilirubin, Albumin             |
| KFT           | `kft`, `kidney`, `renal` | Creatinine, eGFR, Uric Acid              |
| Lipid Profile | `lipid`, `cholesterol`   | Total/LDL/HDL Cholesterol, Triglycerides |
| Thyroid       | `thyroid`                | TSH, T3, T4                              |
| Diabetes      | `diabetes`, `hba1c`      | HbA1c, Fasting Glucose                   |
| Vitamin Panel | `vitamin`                | Vitamin D, B12, Folate, Iron             |

## Developer Debug Panel

When running `pnpm dev`, open a processed uploaded report to view:

- OCR output metadata
- Parsed header fields
- Normalization map
- Extraction warnings
- Raw OCR text

## Error Handling

| Condition          | Behavior                                       |
| ------------------ | ---------------------------------------------- |
| Unreadable PDF     | OCR failure with retry                         |
| Missing values     | Row skipped, warning recorded                  |
| Unknown metric     | Stored with raw name, warning recorded         |
| Multiple tables    | Merged with duplicate resolution by confidence |
| Duplicate metrics  | Highest-confidence value kept                  |
| Low OCR confidence | Fails after retries                            |

## Architecture Notes

- **Client never holds Google credentials** — OCR runs in `supabase/functions/document-ocr`
- **Health module depends on parser output only** — not OCR implementation details
- **Mock provider remains available** via `VITE_OCR_PROVIDER=mock`
- **Google provider falls back** to local mock if edge function is unavailable during development
