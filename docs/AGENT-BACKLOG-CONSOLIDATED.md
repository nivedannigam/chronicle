# Chronicle — Consolidated Agent Backlog

Use this document as the single source of truth when implementing the pending Ask AI, health import, and UX fixes discussed in the March 2026 session.

**Constraints (do not violate unless explicitly noted in a task):**

- Do NOT bypass authentication on `ask-ai`.
- Do NOT change Ask health reasoning / grounded-response business logic unless the task says so.
- Do NOT auto-run LLM on every failed import — AI extraction must be **opt-in** (“Retry with AI”).
- Prefer minimal, focused diffs; match existing code conventions.
- Run tests after substantive changes; do not commit unless the user asks.

---

## Current state (verified)

| Layer                                                          | Status                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| Frontend → `supabase.functions.invoke('ask-ai')`               | ✅ Working                                                    |
| Auth (JWT, `requireSupabaseSession`, explicit `Authorization`) | ✅ Fixed in code                                              |
| Edge function auth (`getUser(jwt)`)                            | ✅ Fixed in code                                              |
| Default model in repo                                          | `gemini-3.5-flash-lite` (frontend + edge constants)           |
| Gemini billing                                                 | User must top up AI Studio prepay credits (ops, not code)     |
| Edge prompt body                                               | ❌ Still stub: `"Hello Chronicle"` — ignores `body.messages`  |
| Ask conversation history                                       | ❌ Duplicate rows (dual localStorage + re-migration)          |
| Health import/retry UX                                         | ❌ Too many entry points; Import Center not embedded in Setup |
| Retry with AI                                                  | ❌ Not built                                                  |
| Deterministic parser failures                                  | ❌ Some reports fail at PARSING stage                         |

---

## Priority order

```
P0  Deploy + restore ask-ai full prompt (blocks useful Ask)
P1  Fix Ask duplicate conversation sessions
P1  Health IA: single Setup hub for import/retry (+ embed ImportCenter)
P1  Deterministic parser fixes for failing report formats
P1  Opt-in “Retry with AI” on import/reprocess
P2  Error copy, remove debug logs, edge model from env, optional guards
```

---

## P0 — Ask AI production path

### P0.1 Ops (user / deploy checklist)

- [ ] `supabase functions deploy ask-ai`
- [ ] Confirm `GEMINI_API_KEY` on project with billing credits
- [ ] Vercel/local env: `VITE_AI_PROVIDER=gemini`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Verify model works: `GET .../v1beta/models?key=...` includes `gemini-3.5-flash-lite`

### P0.2 Restore full Gemini request in edge function

**Problem:** `supabase/functions/ask-ai/gemini.ts` uses `buildSimplifiedGeminiBody()` with hardcoded `SIMPLIFIED_PING_PROMPT = 'Hello Chronicle'`. Frontend sends rich `messages` + JSON schema via `invokeAskAiEdgeFunction`, but edge ignores them.

**Files:**

- `supabase/functions/ask-ai/gemini.ts`
- `supabase/functions/ask-ai/index.ts`
- `supabase/functions/ask-ai/constants.ts`
- `supabase/functions/ask-ai/types.ts`
- `supabase/functions/ask-ai/ask-ai.test.ts`

**Tasks:**

1. Replace simplified ping body with builder that uses `body.messages` from the invoke payload (system + user/evidence messages).
2. Keep `{ action: "ping" }` as a lightweight health check if desired, but **complete** action must use real messages.
3. Use `body.model` when provided, falling back to `GEMINI_MODEL` constant (stop ignoring client model entirely).
4. Update Deno tests; keep `GEMINI_API_KEY` server-side only.
5. Do NOT change frontend prompt builders (`evidence-prompt.builder.ts`, `prompt-templates.ts`) unless needed for wire format alignment.

**Success criteria:**

- Ask “Summarize my latest health report” returns a grounded JSON health summary (not “Hello Chronicle”).
- Edge logs show non-zero `promptMs`, real message count, Gemini completion with usage tokens.
- Auth still passes (`authMs` > 0, no 401).

---

## P1 — Ask duplicate conversation rows

### Problem

Two storage systems write the same conversation:

1. **Indexed sessions:** `chronicle:ask:session-index` + `chronicle:ask:session:{id}` via `ask-session.service.ts`
2. **Legacy key:** `chronicle:ask:conversations` via `conversation-persistence.service.ts`

`useAskChronicle.persistTurns` writes to **both** on every turn. `migrateLegacySessions()` reads legacy key and **creates a new indexed session** on load; legacy key gets repopulated on next ask → duplicates on reload (same title e.g. “hello”, one row with `· Nivedan`, one without).

**Files:**

- `src/features/ask/hooks/useAskChronicle.ts`
- `src/features/ask/services/ask-session.service.ts`
- `src/features/ask/services/conversation-persistence.service.ts`
- `src/features/ask/components/ConversationHistoryDrawer.tsx`
- `src/ui/figma/screens/FigmaAskScreen.tsx` (recent sessions list)

**Tasks:**

1. **Single source of truth:** Indexed sessions only. Stop dual-write to `chronicle:ask:conversations` OR migrate once with a permanent flag (`chronicle:ask:migration-v2`) and never re-import.
2. **Lazy session creation:** Avoid `createAskSession()` on every mount/member switch leaving orphan empty sessions; create on first send or reuse active empty session.
3. **Dedupe utility:** On load, merge index entries with same title + turnCount + first question hash (keep newest).
4. **One-time cleanup:** Optional `dedupeAskSessions(userId)` for existing users.
5. Add/update tests for session service.

**Success criteria:**

- One “hello” conversation → one row in history drawer and Ask home recent sessions.
- Reload page → still one row.
- Member name appears consistently on the single session.

---

## P1 — Health navigation consolidation

### Problem

Import, scan, retry, and reprocess appear in many places with overlapping flows:

- Health → Setup tab (`HealthSettingsPage`, `HealthSetupGuide`, `ImportJourneyStep`)
- Orphan `ImportCenter` component (not embedded in Setup; `ImportCenterPage` routes redirect)
- `/health/import/review` still standalone
- Profile → Health setup, Home shortcuts, Metrics/Insights empty states, report detail reprocess
- Dead routes redirect to settings (good) but UX still feels duplicated

**Target IA:**

```
Health tab
├── Overview   (/health)
├── Reports    (/health/reports) — per-report reprocess OK
├── Timeline   (/health/timeline)
├── Metrics    (/health/metrics)
├── Insights   (/health/insights)
└── Setup      (/health/settings) — SINGLE hub for connect, scan, queue, failed/retry, reprocess all
```

**Tasks:**

1. Embed `ImportCenter` in `HealthSettingsPage` (failed imports, retry failed, reprocess metric-less, bulk actions).
2. Consolidate copy/CTAs: empty states on Metrics/Insights/Reports → “Go to Setup” (not mixed routes).
3. Home health shortcut → `/health`; if `failedCount > 0`, deep-link `/health/settings` with visible “import issues” banner.
4. Profile “Health setup” → `/health/settings` (same surface).
5. Fold `/health/import/review` into Setup section or Reports filter “needs review” (redirect old URL).
6. Remove or reduce duplicate scan/retry UI between `HealthSetupGuide` and embedded Import Center (one primary flow).

**Files (likely):**

- `src/features/health/pages/HealthSettingsPage.tsx`
- `src/features/health-import/components/ImportCenter.tsx`
- `src/ui/figma/screens/FigmaHomeScreen.tsx`
- `src/ui/figma/screens/FigmaProfileScreen.tsx`
- `src/features/health/pages/HealthMetricsPage.tsx`, `HealthInsightsPage.tsx`, `HealthReportsPage.tsx`
- `src/app/router.tsx`
- `src/constants/routes.ts`

**Success criteria:**

- User can retry failed imports, reprocess all, and scan from **one** Setup screen.
- No dead-end duplicate “import” pages in normal navigation.
- Home/Profile shortcuts land predictably on Health or Setup when issues exist.

---

## P1 — Deterministic parser fixes

**Problem:** Reports fail with `OCR completed but no laboratory metrics were extracted` (`failedStage: PARSING`). Failed reports excluded from knowledge (`status === 'completed'` only). Highest ROI before LLM.

**Files:**

- `src/features/health/extraction/**`
- `src/features/health/services/health-processing.service.ts`
- `src/features/health-knowledge/providers/health-knowledge.provider.ts`
- Fixtures: `src/features/health/extraction/fixtures/`, `_fixtures/lab-reports/`

**Tasks:**

1. Identify failing report formats from Import Center / `processing_error` samples.
2. Extend layout extractors / Thyrocare text extractor / metric definitions.
3. Add fixture + test per format (`thyrocare-text.extractor.test.ts` pattern).
4. Reprocess failed reports after parser fix.

**Success criteria:**

- Previously failed reports extract metrics after reprocess (deterministic, no LLM).

---

## P1 — Opt-in “Retry with AI”

**Problem:** User wants control when OCR/parser fails; discussed token cost ~~12k–18k tokens (~~$0.002–0.004/report) for text-based extraction.

**Design:**

- **NOT** automatic on failure.
- **NOT** Ask-time LLM for failed scans.
- Run at **import/reprocess** time only.

**Modes:**

| Mode                      | When                        | Input                   |
| ------------------------- | --------------------------- | ----------------------- |
| `deterministic` (default) | Retry / Reprocess           | Current pipeline        |
| `llm_text`                | User clicks “Retry with AI” | Stored `extracted_text` |
| `llm_vision`              | Phase 2                     | PDF pages (expensive)   |

**Tasks:**

1. Extend `processHealthReport(reportId, { force, extractionMode })`.
2. New edge function `extract-metrics-ai` (preferred) OR `ask-ai` action `extract_metrics` — strict JSON schema matching `parsed_data` metrics shape.
3. Validate output; set `extractionMethod: 'llm'`, lower confidence, `validationStatus: 'partial'`.
4. UI: Report detail + Import Center failed section:
   - “Reprocess” (existing)
   - “Reprocess with AI” (confirm dialog with brief cost/privacy note)
5. Bulk: “Retry failed with AI (N)” only for reports with `extracted_text`.

**Files:**

- `src/features/health/services/health-processing.service.ts`
- `src/features/health/pages/HealthReportDetailPage.tsx`
- `src/features/health-import/components/ImportCenter.tsx`
- New: `supabase/functions/extract-metrics-ai/` (or extend ask-ai)

**Success criteria:**

- Standard retry unchanged.
- AI retry only when user explicitly chooses it.
- Successful AI retry → `status: completed` with flagged LLM metrics.

---

## P2 — Polish

### P2.1 Gemini error messages in UI

Map edge errors clearly:

- 429 + “prepayment credits depleted” → billing message (not “rate limit”)
- 404 model → “Model not available — contact support / check deployment”
- 401 → sign in again

**File:** `src/shared/ai/providers/gemini.provider.ts`, `src/features/ask/services/platform-response.adapter.ts`

### P2.2 Remove temporary auth debug logs

**Files:**

- `src/shared/ai/transport/ask-ai-edge.client.ts` (console “Ask AI auth diagnostics”)
- `supabase/functions/ask-ai/index.ts` (Authorization header logs)

Gate behind `import.meta.env.DEV` or remove when stable.

### P2.3 Edge respects env model

Align `GEMINI_MODEL` in edge with frontend; read from env secret or request body consistently.

### P2.4 Optional: skip Ask LLM when no completed reports

Guard in `ai-ask-reasoning.engine.ts` or `AIPlatformPipeline` — return config/grounded message instead of calling Gemini when no display-ready reports (saves cost).

### P2.5 Optional: dev Ask routing debug banner

Show `production-ai` | `grounded` | `explainability` per turn in DEV only.

---

## Key architecture references

### Ask → LLM path (production health only)

```
FigmaAskScreen → useAskChronicle.ask()
  → aiAskReasoningEngine.answerQuestion()
  → shouldUseProductionAi() [health LLM intent + gemini configured]
  → runProductionHealthAi() → AIPlatformPipeline → GeminiProvider
  → invokeAskAiEdgeFunction() → supabase.functions.invoke('ask-ai')
```

Most questions (grounded beta, explainability, UNKNOWN intent) → **no network call** (by design).

### Import → no LLM today

```
PDF → document-ocr → deterministic parser → health_reports.parsed_data
```

Failed scan does **not** block Ask LLM today; Ask runs with sparse evidence and `insufficient_data` prompt guidance.

### Session / storage keys

| Key                                     | Purpose                                        |
| --------------------------------------- | ---------------------------------------------- |
| `chronicle:ask:session-index`           | Session list metadata                          |
| `chronicle:ask:session:{userId}:{uuid}` | Turn data per session                          |
| `chronicle:ask:conversations`           | Legacy per-member-key store (**causes dupes**) |

### Health env

```env
VITE_AI_PROVIDER=gemini
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
# Edge secret only:
GEMINI_API_KEY=...
```

---

## Test plan (end-to-end)

### Ask AI

- [ ] Sign in → Ask “Summarize my latest health report” → Network shows `ask-ai` 200
- [ ] Response is health JSON summary, not stub text
- [ ] One conversation → one history row after reload

### Health import

- [ ] Failed report → Setup shows retry options in one place
- [ ] Standard reprocess works
- [ ] (When built) Retry with AI works on parser-failed report with OCR text

### Regression

- [ ] `pnpm test` passes
- [ ] Grounded Ask questions still work without network
- [ ] Auth still required for `ask-ai` (401 when signed out)

---

## Suggested implementation batches (for separate agent runs)

**Batch A — Ask AI live (P0)**  
Restore edge prompt + deploy + verify E2E.

**Batch B — Ask dupes (P1)**  
Single session storage + dedupe + tests.

**Batch C — Health Setup hub (P1)**  
Embed ImportCenter + shortcut consolidation + redirects.

**Batch D — Parser fixes (P1)**  
Format-specific extraction for known failures.

**Batch E — Retry with AI (P1)**  
Edge function + UI opt-in + validation.

**Batch F — Polish (P2)**  
Errors, logs, optional guards.

---

## Agent handoff prompt (copy-paste)

```
Implement Chronicle backlog from docs/AGENT-BACKLOG-CONSOLIDATED.md.

Start with Batch [A/B/C/D/E/F] only — do not scope-creep into other batches unless blocked.

Read the doc section for that batch, inspect listed files, implement with minimal diff, run tests, summarize what changed and what remains.

Constraints: no auth bypass; no automatic LLM on import failure; no Ask prompt/business logic changes unless the batch requires it (Batch A restores edge wire-up only).
```

Replace `[A/B/C/D/E/F]` with the batch to run.
