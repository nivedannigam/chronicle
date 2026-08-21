# Chronicle QA Gate

The automated QA harness is the mandatory regression gate for Chronicle.

## Command

```bash
pnpm run test:chronicle
```

This runs:

1. **Vitest safety tests** — `src/qa/__tests__/qa-mode.test.ts`
2. **Playwright harness** — desktop, tablet, and mobile projects
3. **Report generation** — `docs/QA_AUTOMATED_VALIDATION.md`

Reset QA state before manual investigation:

```bash
pnpm run test:chronicle:reset
```

## CI policy

`pnpm run test:chronicle` **must fail CI** when:

| Failure type                                                               | Action      |
| -------------------------------------------------------------------------- | ----------- |
| **P0** product regression                                                  | Block merge |
| **P1** product regression                                                  | Block merge |
| Actual functional regression (route broken, privacy leak, empty-state lie) | Block merge |

`pnpm run test:chronicle` **must not fail CI** for:

- Intentionally skipped tests (desktop-only visual/detail routes on tablet/mobile)
- Diagnostic latency measurements (`ask-latency.spec.ts` records timing; thresholds are not gate failures)

## Preconditions

- `VITE_CHRONICLE_QA_MODE=true` is injected by Playwright webServer only
- Dedicated port (default **5199**, override with `CHRONICLE_QA_PORT`)
- Synthetic user `qa@chronicle.local` — no production data

## Safety invariants

| Invariant                                | Enforcement                                               |
| ---------------------------------------- | --------------------------------------------------------- |
| QA mode only in DEV                      | `isQaModeEnabled()` requires `import.meta.env.DEV`        |
| Production cannot enable QA flag         | `assertQaModeProductionSafe()` throws in PROD builds      |
| QA data isolated                         | Storage prefix `chronicle:qa:v1:`                         |
| Reset cannot delete production keys      | `clearQaStorage()` filters by prefix; E2E `reset.spec.ts` |
| Service interceptors inactive outside QA | Guarded by `isQaModeEnabled()` / `assertQaUserId()`       |

## What the suite measures

- Route health (35 contracts + console/network audit)
- Navigation flows
- Library, Search, Ask, Timeline, Privacy
- Family scope
- EMPTY / ERROR / LOADING scenarios
- Responsive overflow (390×844, 768×1024, 1440×900)
- Accessibility smoke
- Performance budgets

## Related docs

- `docs/QA_AUTOMATED_VALIDATION.md` — latest run summary
- `docs/QA_FAILURE_CLASSIFICATION.md` — calibration taxonomy
- `docs/ASK_LATENCY_REPORT.md` — grounded Ask timing diagnostics
