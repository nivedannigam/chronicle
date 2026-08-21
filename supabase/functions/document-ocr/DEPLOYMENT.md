# Deploying document-ocr (Native PDF First)

Gate 1 adds native PDF text extraction to the `document-ocr` edge function. **Production behavior does not change until this function is redeployed.**

## Prerequisites

Google Document AI secrets must already be configured (OCR fallback still uses Document AI when native text is insufficient).

## Deploy command

From the repository root, with Supabase CLI linked to the project:

```bash
npx supabase functions deploy document-ocr --project-ref <YOUR_PROJECT_REF>
```

Example (Chronicle staging reference from existing docs):

```bash
npx supabase functions deploy document-ocr --project-ref mqmznhyndzqtieaxaiyu
```

## Verify after deploy

1. Upload or reprocess a **text-based PDF** (not scanned).
2. Check edge logs for `native_pdf_text_used` (structured log in `document-ocr/index.ts`).
3. Confirm client observability shows `contentSource: NATIVE_TEXT` or provider `native-pdf-text`.
4. Upload a **scanned PDF** and confirm Google Document AI is invoked (provider `google-document-ai`).

## Do not

- Deploy automatically from CI unless explicitly configured.
- Reprocess Insurance production documents as part of deployment verification.

## Related files

- `supabase/functions/document-ocr/native-pdf-text.ts`
- `supabase/functions/document-ocr/index.ts`
- `src/features/document-intelligence/content/resolve-document-content.service.ts`
