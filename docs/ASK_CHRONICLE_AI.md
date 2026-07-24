# Ask Chronicle AI Layer

Ask Chronicle answers natural-language questions using **only structured knowledge** from the Health Knowledge Graph. It never reads raw PDFs and never invents data.

## Architecture

```
User Question
     ↓
Intent Detection (+ conversation memory resolution)
     ↓
KnowledgeRetriever (HealthKnowledgeRetriever)
     ↓
PromptBuilder (structured context + safety rules)
     ↓
AIService (provider abstraction, streaming, cache, retry, timeout)
     ↓
Grounded Response + Citations + Cards
```

## Folder structure

```
src/config/ask-ai.ts
src/features/ai/
src/features/knowledge/retrieval/
src/features/ask/retrieval/
src/features/ask/prompt/
src/features/ask/memory/
src/features/ask/services/
supabase/functions/ask-ai/index.ts
```

## Providers

| Provider       | Config value   | Notes                                               |
| -------------- | -------------- | --------------------------------------------------- |
| Mock (default) | `mock`         | Deterministic grounded answers from knowledge graph |
| OpenAI         | `openai`       | Direct API or proxy                                 |
| Azure OpenAI   | `azure-openai` | Requires endpoint + deployment                      |
| Gemini         | `gemini`       | Proxy recommended                                   |
| Claude         | `claude`       | Direct API or proxy                                 |

## Grounding rules

1. Retrieval first — only relevant metrics, timelines, trends, and reports
2. No full database — context is intent-scoped and size-limited
3. Citation verification — LLM citations filtered against retrieved IDs
4. Fallback — deterministic grounded answer if provider fails
5. Safety footer on every answer

## Adding new knowledge domains

Implement the generic `KnowledgeRetriever` interface and register by domain in the reasoning engine. PromptBuilder, AIService, streaming UI, and debug panel stay unchanged.

See also: [HEALTH_KNOWLEDGE_GRAPH.md](./HEALTH_KNOWLEDGE_GRAPH.md)
