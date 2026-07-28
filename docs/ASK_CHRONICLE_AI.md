# Ask Chronicle — Personal Intelligence Assistant

Ask Chronicle is **not** a chatbot and **not** a generic LLM interface. It is **Chronicle Intelligence** — a premium personal assistant grounded in the user's health records, documents, and family context.

---

## Design Principles

| Principle                 | Implementation                                                   |
| ------------------------- | ---------------------------------------------------------------- |
| Human-first               | Direct answers in plain language — never raw OCR or metric dumps |
| Insight-first             | Lead with what matters; explain briefly; recommend actions       |
| Evidence-on-demand        | Collapsed evidence panel — optional, never forced                |
| Trust before intelligence | Confidence levels, uncertainty notes, missing-info transparency  |
| Never overwhelm           | Structured 5-part response layout, rich cards only when useful   |

---

## Information Architecture

```
/ask                          → Ask home + active conversation
/search                       → Unified search (results or ask a question)
/ask?q=...                    → Deep link — auto-submits question
/health, /documents, /profile → Context sources (not modules user must choose)
```

### Knowledge domains (seamless, no module switching)

| Domain    | Source                                   | Examples                                 |
| --------- | ---------------------------------------- | ---------------------------------------- |
| Health    | Health reports, metrics, knowledge graph | "What changed since my last blood test?" |
| Documents | Chronicle documents + Drive sync         | "When does my passport expire?"          |
| Family    | Member context, name resolution          | "Show my daughter's vaccination records" |
| Timeline  | Cross-domain events                      | "Everything about my Europe trip"        |

Future domains (extension points): Finance, Travel, Insurance, Assets.

---

## Ask Home Experience

When no conversation is active, the home shows:

1. **Personalized greeting** — time-of-day + name
2. **Recent insights** — document attention, health availability, family context
3. **Quick actions** — Search, Health, Documents
4. **Suggested questions** — data-driven from user's actual records
5. **Recent conversations** — persisted session history

### Suggested question strategy

Three layers:

| Layer         | Source                                | When used                                                          |
| ------------- | ------------------------------------- | ------------------------------------------------------------------ |
| Dynamic       | `dynamic-suggestions.service.ts`      | Primary — derived from reports, metrics, documents, family members |
| Static groups | `ASK_QUESTION_GROUPS` in product-copy | Category browsing, future modules                                  |
| Follow-ups    | `follow-up-generator.service.ts`      | Per-turn contextual chips                                          |

Dynamic examples (when data exists):

- Summarize latest health report
- What changed since last blood test?
- Compare cholesterol over 3 years
- When does my passport expire?
- Show documents related to my house
- Which insurance policies expire this year?
- Show [child]'s vaccination records
- Which family member has pending renewals?

---

## Conversation Flow

```
User question (+ optional ?q= deep link)
     ↓
Follow-up resolution (conversation memory)
     ↓
Intent detection (25+ intents, cross-domain)
     ↓
Knowledge orchestrator (health + documents + timeline providers)
     ↓
Prompt builder (structured context + personalization + history)
     ↓
AI provider OR grounded-only answer
     ↓
Trust envelope (citations, confidence, disagreements, missing info)
     ↓
Structured response view (direct → explain → recommend → evidence → follow-ups)
     ↓
Persist session + sync recent questions
```

---

## Response Structure

Every answer follows this layout in the UI:

1. **Direct answer** — first sentence, plain language
2. **Explanation** — 2–3 sentences of context
3. **Recommendations** — actionable bullets from alerts, missing info, cards
4. **Supporting evidence** — collapsed by default (`EvidencePanel`)
5. **Related questions** — intelligent follow-up chips

Built by `structured-response.service.ts` from turn + trust envelope.

### AI response templates

Templates in `ask-response-templates.ts`:

- `noData` — when records don't exist
- `uncertain` — partial/unreadable scans
- `expiringDocuments` — document attention
- `healthCompare` — metric comparison

Intent-specific guidance via `intentResponseGuidance()`.

### System prompt rules (`prompt-builder.ts`)

- Direct answer first, never raw data
- State uncertainty clearly
- Use natural personalization ("your passport", "your daughter")
- Medical safety footer on health answers
- JSON output: `{ answer, confidence, citations }`

---

## Components

### Added / Redesigned

| Component                   | Location      | Purpose                     |
| --------------------------- | ------------- | --------------------------- |
| `AskGreetingCard`           | `ask-ui.tsx`  | Personalized welcome        |
| `AskSuggestedQuestionRow`   | `ask-ui.tsx`  | Data-driven suggestion      |
| `AskRecentSessionRow`       | `ask-ui.tsx`  | Conversation history item   |
| `AskQuickActionCard`        | `ask-ui.tsx`  | Search / Health / Documents |
| `AskInsightRow`             | `ask-ui.tsx`  | Recent cross-domain insight |
| `AskStructuredResponseView` | `ask-ui.tsx`  | 5-part response layout      |
| `AskHistoryButton`          | `ask-ui.tsx`  | Opens session drawer        |
| `FigmaAskScreen`            | `screens/`    | Full home + conversation UX |
| `ConversationTurnView`      | `components/` | Structured turn rendering   |

### Wired (previously built, now connected)

| Component                   | Now used for                                   |
| --------------------------- | ---------------------------------------------- |
| `ConversationHistoryDrawer` | Session list, rename, delete, new conversation |
| `EvidencePanel`             | Collapsed supporting evidence                  |
| `FollowUpChips`             | Related questions section                      |
| `AnswerCardRenderer`        | Rich metric/trend/report cards                 |

### Removed / Deprioritized

| Pattern                       | Status                                   |
| ----------------------------- | ---------------------------------------- |
| Generic chat bubble dump      | Replaced by structured response          |
| Always-visible sources        | Collapsed evidence panel                 |
| Empty Search recent questions | Fixed via `syncRecentQuestionsFromTurns` |
| Broken `/ask?q=` deep links   | Fixed via `useSearchParams`              |

---

## Memory & Sessions

| Layer               | Storage        | Scope                               |
| ------------------- | -------------- | ----------------------------------- |
| Conversation memory | In-memory      | Last 8 turns — follow-up resolution |
| Session persistence | localStorage   | 50 turns per session                |
| Session index       | localStorage   | Multi-session history with titles   |
| Recent questions    | In-memory sync | Global Search "Recent" section      |

Session key: `userId:memberId` — switching family member starts a new context.

---

## Search + Chat Integration

- Ask header → `/search`
- Search unmatched hits → `/ask?q=...`
- Documents/health screens → `/ask?q=...`
- Ask consumes `?q=` on landing and auto-submits
- Recent questions synced after every successful turn

---

## Voice (Future Ready)

Architecture types in `structured-response.types.ts`:

```typescript
AskVoiceSessionConfig { enabled: false, locale, wakePhrase? }
AskVoiceTurn { sessionId, transcript, responseText, timestamp }
```

Not implemented — types only for future extension.

---

## Future Extension Points

### Finance

- Enable `ASK_QUESTION_GROUPS.finance`
- Add finance knowledge provider
- Templates for spending, mortgage, investments

### Travel

- Trip-scoped semantic search ("Everything about my Europe trip")
- Passport → visa → tickets → insurance chain

### Insurance

- Policy renewal reminders cross-linked with documents
- "Which insurance policies expire this year?"

### Assets

- Vehicles, property registration gaps
- Cross-link property ↔ loan ↔ insurance

### Elevated AI

- Vector semantic retrieval (currently token-match)
- LLM-generated action cards
- Server-side conversation persistence
- Proactive insights push

---

## File Map

```
src/features/ask/
  services/
    ask-home.service.ts              # Home view builder
    structured-response.service.ts   # 5-part response layout
    dynamic-suggestions.service.ts   # Data-driven suggestions
    ai-ask-reasoning.engine.ts       # Main pipeline
    grounded-response.builder.ts     # Cards + trust baseline
  constants/
    ask-response-templates.ts        # Response templates
  prompt/
    prompt-builder.ts                # System prompt + rules
  types/
    structured-response.types.ts     # Structured + voice types
  hooks/
    useAskChronicle.ts               # State, sessions, persistence

src/ui/figma/
  ask/ask-ui.tsx                     # Premium Ask UI primitives
  screens/FigmaAskScreen.tsx         # Production Ask screen
```

---

## Success Criteria Checklist

- [x] Welcoming home before user types (greeting, suggestions, insights)
- [x] Structured responses: direct → explain → recommend → evidence → follow-ups
- [x] Evidence collapsed by default
- [x] Cross-domain questions without module switching
- [x] Personalized context (family names, documents, health)
- [x] Transparency when uncertain
- [x] Search + chat integration with deep links
- [x] Session memory and recent conversations
- [x] Voice-ready architecture (types only)
- [ ] Vector semantic search (future)
- [ ] Finance / Travel / Insurance providers (future)
