# Chronicle Gate 0 Trust Foundation Report

**Date:** 2026-08-21  
**Scope:** Privacy contract, Ask evidence gate, fact provenance, insurance heuristic handling  
**Production data:** NOT modified  
**Insurance P1-02:** Preserved (no reprocessing, dedupe keys unchanged)

---

## 1. Privacy Architecture Before / After

### Before

- Member scoping spread across hooks/providers with inconsistent enforcement
- `resolveMemberFromQuestion` switched Ask retrieval to **named member in question** (cross-member leak vector)
- Timeline included all `familyMemberId == null` events for any member filter
- Insurance library provider lacked `matchesLibraryMember` defense-in-depth
- No explicit privacy or provenance contracts

### After

- **`privacy-scope.contract.ts`** — `member | shared | account` scope vocabulary
- **`privacy-authorization.service.ts`** — centralized `canViewerAccessResource`, `resolveAskAuthorization`, `filterResourcesForMember`
- Ask authorization runs **before** evidence retrieval
- Timeline filters account-level events to account owner only; shared events via `metadata.privacyScope === 'shared'`
- Documents filter includes explicit shared scope via `extracted_metadata.privacyScope`
- Insurance library provider applies `matchesLibraryMember`

---

## 2. Authorization Path

```
UI selectedMemberId (viewer)
  → resolveAskAuthorization(question, viewer, members)
       RESTRICTED → gated turn (no retrieval)
       ALLOWED → retrievalMemberId
  → gatherUniversalEvidence / health pipeline (scoped)
  → evaluateAskEvidenceGate
       NOT_FOUND → refuse to answer
       ANSWERABLE → structured answer from evidence
  → narrative/companion blocked when gate says NOT_FOUND/RESTRICTED
```

Library / Search / Timeline:

```
familyMemberId + privacyScope on record
  → filterDocumentsForMember / matchesLibraryMember / filterTimelineEvents
  → render only authorized rows
```

---

## 3. Cross-Member Test Matrix

| Surface   | Test                               | Status            |
| --------- | ---------------------------------- | ----------------- |
| Ask       | Cross-member LDL (Priya)           | Unit + Playwright |
| Ask       | Cross-member passport (Ravi)       | Unit + Playwright |
| Ask       | Self question                      | Unit              |
| Ask       | All Family named member            | Unit              |
| Library   | Priya private doc hidden           | Unit + Playwright |
| Search    | Priya policy number hidden         | Playwright        |
| Timeline  | Member B event hidden for member A | Unit              |
| Documents | Shared doc visible to all members  | Unit              |
| Documents | Account-level doc owner-only       | Unit              |

**QA family:** Nivedan, Priya, Advika, Ravi (+ shared family insurance doc in `build-qa-privacy-trust.ts`)

**Not yet automated:** Home module cards, module detail pages, document detail cross-member deep links, full 4×8 Playwright matrix

---

## 4. Ask Evidence Architecture

**Contract:** `ANSWERABLE | PARTIAL | NOT_FOUND | RESTRICTED`

Implemented in `ask-answer-contract.ts` + `ask-gated-turn.builder.ts`

- Universal Ask evaluates gate after authorized evidence gather
- Companion AI path blocked when `shouldBlockNarrativeWithoutEvidence`
- Default refusal: _"I couldn't find enough information in your records to answer that."_
- Restricted: _"I can't share another family member's private information..."_

---

## 5. Narrative Ask Audit

| Path                                  | Authorization  | Evidence gate                 |
| ------------------------------------- | -------------- | ----------------------------- |
| Universal structured                  | Yes            | Yes                           |
| Universal narrative (evidence bundle) | Yes            | Yes                           |
| Companion single-domain               | Yes            | **Blocked without evidence**  |
| Health fact lookup                    | Yes (new gate) | Existing                      |
| Health Gemini narrative               | Yes            | attachTrustToTurn (unchanged) |

---

## 6. Fact Provenance Model

**`fact-provenance.contract.ts`:** CONFIRMED, AI_EXTRACTED, USER_PROVIDED, INFERRED, NEEDS_REVIEW

Mapped from extraction methods via `provenanceFromExtractionMethod()`.

Insurance policy numbers: `policy-number-provenance.ts` distinguishes internal fallback keys from AI-extracted numbers.

---

## 7. Heuristic Facts Identified

| Field                          | Module    | Provenance when heuristic               |
| ------------------------------ | --------- | --------------------------------------- |
| Policy number (colon fallback) | Insurance | INFERRED — hidden from consumer display |
| Insurer from filename          | Insurance | INFERRED                                |
| Registration/VIN regex         | Vehicles  | INFERRED (unchanged this gate)          |
| Document type from filename    | Identity  | INFERRED                                |
| Property name from folder      | Property  | INFERRED                                |
| Finance labels                 | Finance   | INFERRED                                |

---

## 8. Insurance Fallback Policy Handling

**Internal dedupe key preserved:** `{insurerId}:{policyType}:{fileStem}` still stored in `policy_number` for stable identity.

**Display change:**

- `resolveConsumerPolicyNumber()` returns `null` for inferred internal keys
- Library/ready checks use consumer number → shows **"Needs review"** instead of fake policy number
- `parsed_data.policyNumberProvenance` stored on new processing (`AI_EXTRACTED` | `INFERRED`)

**Real motor policies with AI extraction (`llm`) remain unchanged.**

---

## 9–11. Library / Search / Timeline Privacy

- **Library:** `filterDocumentsForMember` + insurance provider `matchesLibraryMember`
- **Search:** Uses `selectedMemberId` via `useGlobalSearch` (existing); QA Playwright verifies private policy number not surfaced
- **Timeline:** `filterTimelineEvents` no longer leaks null-member events to non-owner members

---

## 12. Knowledge Layer

No second source of truth added. Authorization applied at query boundaries; provenance on insurance parsed_data.

---

## 13. Tests

### Unit (20 tests)

- `privacy-authorization.service.test.ts` (6)
- `ask-answer-contract.test.ts` (3)
- `policy-number-provenance.test.ts` (3)
- `timeline-privacy.test.ts` (2)
- `document-privacy.test.ts` (2)
- `library-privacy.test.ts` (1)
- `policy-display-ready.test.ts` (3, regression)

### Playwright

- `trust-privacy.spec.ts` (4)
- `ask-states.spec.ts` (21, regression — all passed in combined run)

---

## 14. QA Result

| Suite                                     | Result                                        |
| ----------------------------------------- | --------------------------------------------- |
| Trust unit tests                          | **20/20 passed**                              |
| Insurance processing regression           | **5/5 passed**                                |
| Ask builder regression                    | **3/3 passed**                                |
| Playwright ask-states + trust (first run) | **21/23 passed** (library/search e2e refined) |
| Full `pnpm run test:chronicle`            | **NOT RUN** (targeted gate only)              |

---

## 15. Remaining P0

| ID    | Issue                             | Status                                          |
| ----- | --------------------------------- | ----------------------------------------------- |
| P0-01 | Real-data cross-member isolation  | **NOT VALIDATED** — QA synthetic only           |
| P0-02 | Heuristic policy numbers as facts | **Mitigated** — display layer + provenance      |
| P0-03 | Ask without evidence              | **Mitigated** — evidence gate + companion block |

---

## 16. P1/P2 Introduced

None new. Timeline property bootstrap omission remains P1 from prior audit.

---

## 17. Files Changed

**New:**

- `src/core/platform/contracts/privacy-scope.contract.ts`
- `src/core/platform/contracts/fact-provenance.contract.ts`
- `src/core/platform/services/privacy-authorization.service.ts`
- `src/features/ask/trust/ask-answer-contract.ts`
- `src/features/ask/trust/ask-gated-turn.builder.ts`
- `src/features/insurance-knowledge/utils/policy-number-provenance.ts`
- `src/qa/seed/build-qa-privacy-trust.ts`
- Unit tests (6 files)
- `e2e/chronicle/trust-privacy.spec.ts`

**Modified:**

- `src/features/ask/services/universal-ask.service.ts`
- `src/features/ask/services/ai-ask-reasoning.engine.ts`
- `src/features/insurance-import/services/insurance-processing.service.ts`
- `src/features/insurance-knowledge/services/insurance-knowledge-builder.ts`
- `src/core/platform/providers/insurance-module.provider.ts`
- `src/features/documents/services/document.service.ts`
- `src/features/timeline/engine/timeline-engine.ts`
- `src/features/timeline/types/timeline.types.ts`
- `src/features/timeline/hooks/useTimelineEvents.ts`
- `src/qa/seed/build-qa-dataset.ts`

---

## 18. Trust Foundation Score: **7/10**

Strong foundation for QA-validated paths. Not 9+ until real-data privacy matrix passes and full surface Playwright matrix completes.

---

## Critical Answers

### Can Chronicle guarantee Ask/Search/Library/Timeline cannot reveal another member's private information?

**QA synthetic data: largely yes** for implemented paths with automated tests.  
**Production real data: NOT VALIDATED — cannot claim guarantee.**

### Can Chronicle refuse to answer when sufficient evidence does not exist?

**Yes for universal Ask structured path and blocked companion fallback** — proven by unit tests + negative Ask Playwright tests.  
**Health Gemini narrative path** still uses AI with trust attachment — separate contract; not fully gated to NOT_FOUND on empty evidence.

---

## Recommended Next Steps (Gate 0 completion)

1. Real-data privacy penetration suite (4 members × surfaces) — read-only
2. Full Playwright matrix with reliable family switcher selection
3. Apply `resolveAskAuthorization` to domain-companion dead code paths (cleanup)
4. Search provider-level unit tests per module with member scope
5. Run full `pnpm run test:chronicle` before merge
