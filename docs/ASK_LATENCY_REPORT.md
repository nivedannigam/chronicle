# Ask Latency Report (QA Grounded)

Generated: 2026-08-21T08:26:33.196Z

Diagnostic thresholds: <10s excellent · 10–20s acceptable · 20–30s noticeable · 30–60s poor · >60s unacceptable

| Question                            | Answer (ms) | Evidence (ms) | Total (ms) | Class        | Provider             | Routing  | Engine (ms) |
| ----------------------------------- | ----------: | ------------: | ---------: | ------------ | -------------------- | -------- | ----------: |
| What is my LDL?                     |         247 |             — |       4254 | excellent    | fact-lookup          | grounded |          32 |
| When does my car insurance expire?  |         477 |             — |       5435 | excellent    | structured-universal | grounded |         257 |
| What is my home loan balance?       |         122 |             — |       5112 | excellent    | structured-universal | grounded |          24 |
| When does my passport expire?       |         158 |             — |       5110 | excellent    | structured-universal | grounded |          38 |
| When did I buy my Pune home?        |         137 |             — |       5093 | excellent    | structured-universal | grounded |          26 |
| Show me everything about my XEV 9e. |           0 |             — |      90000 | unacceptable | —                    | —        |           — |

## Root-cause notes

- **Show me everything about my XEV 9e.** (90000ms): provider=unknown, routing=unknown. Likely bottleneck: timeout — likely companion AI / Gemini narrative path or stuck streaming state.
