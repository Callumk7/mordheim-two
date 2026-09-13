# Refine image prompts with a text LLM (MOR-46)

## Context

Image jobs today take the D1 `prompt` snapshot, append `Create the image in the style of John Blanche.` in `prepareImagePrompt`, and send that string to Gemini or OpenAI image models.

Producers already store **structured labeled snapshots** (warrior / event / match / `/queue` free text), not a finished image brief. MOR-46 adds a Gemini Flash refinement step in `workers/image-generation` so the image model receives only the refiner’s output.

Decisions:

- **Model:** Gemini Flash text (`gemini-3.5-flash`, named constant — easy to retune).
- **Failure:** no fallback to the raw prompt. If refinement fails, the job fails. Record a sanitized reason on the job. Durability/logging improvements are out of scope.
- **Persistence:** new nullable D1 `refined_prompt` column; show it on `/queue-jobs`.
- **Style:** move John Blanche / core style rules into the **refiner system prompt**. The image generator is passed the refiner output **unchanged**. Do not append the Blanche suffix after refinement.

## Approach

### Pipeline

In `processJob`, after a successful claim and R2 miss (same as today: never pay if the JPEG already exists):

1. Call `refinePrompt(job.prompt)` with the durable structured snapshot.
2. Persist the returned string on the claimed row (`refined_prompt`) **before** the image call, so a later image failure still has the brief for diagnosis.
3. `generator.generate(refinedPrompt)` — no `prepareImagePrompt`.
4. Existing R2 put + D1 complete.

If R2 already has a valid object, skip refinement and generation (unchanged recovery).

### Prompt refiner (DI)

Add to `ConsumerDependencies`:

```ts
refinePrompt: (prompt: string) => Promise<string>;
```

Wire a Gemini Flash adapter in `index.ts` with `GEMINI_API_KEY`. **Every job needs Gemini for refinement**, including OpenAI image jobs (`gpt-image-2` portraits). Missing `GEMINI_API_KEY` fails the job with the existing sanitized “not configured” message.

Adapter rules, matching image providers:

- `maxRetries: 0`
- abort via `AbortSignal.timeout` (use a dedicated `REFINEMENT_TIMEOUT_MS`, e.g. 30s — text should fail faster than the 120s image timeout)
- do not log prompts, API keys, or raw provider bodies
- empty / non-text output → permanent `GenerationError`

Replace `prepareImagePrompt` with:

- a **system / instruction** string: John Blanche style, Mordheim gothic illustration, preserve labeled facts, do not invent names/factions/outcomes/equipment, keep the source scene type (portrait vs event vs match vs freeform), no text/logos/modern objects unless the source requires them, **output only the image prompt** (no preamble or markdown)
- the user content is `job.prompt` as-is

Producer builders stay as structured snapshots. Do not re-fetch warrior/event rows in the consumer.

### Failure policy (naive)

No raw-prompt fallback. On any refinement error:

- Sanitize to a **stage-specific** D1 message, e.g. `Prompt refinement HTTP 429.` / `Prompt refinement failed or timed out.` / `Prompt refiner did not return a prompt.` — not `Image provider HTTP …`, so `/queue-jobs` shows which stage died.
- Treat refinement errors as **permanent**: `jobs.fail` + ack. Do not queue-retry refinement in this slice.
- Image-provider / R2 / D1 failures keep today’s retry vs permanent vs exhaustion behavior.
- If `jobs.fail` itself throws, keep today’s retry (do not ack a job that never recorded failure).

### Schema and UI

- `image_generation_jobs.refined_prompt` nullable text. Original `prompt` unchanged (4000-char producer cap). Do not cap the refined column at 4000; trim only empty output.
- `pnpm db:generate` then apply locally.
- `createJobStore.recordRefinedPrompt(id, token, prompt)` via existing `updateOwned` (lease-guarded).
- Naive retries of **image** failures re-refine and overwrite the column.
- `/queue-jobs`: add a “Refined prompt” column next to Prompt. `listQueueJobs` already `select()`s the full row.

## Files to modify

- `src/db/schema.ts` — `refinedPrompt`
- `drizzle/` — generated migration; `workers/image-generation/src/test-support.ts` (and any other in-memory migration lists) must apply it
- `workers/image-generation/src/generation/types.ts` — `PromptRefiner` if kept as a named type
- `workers/image-generation/src/generation/prompt.ts` — drop Blanche suffix helper; add refinement instructions
- `workers/image-generation/src/generation/prompt.test.ts`
- `workers/image-generation/src/generation/config.ts` — `REFINEMENT_TIMEOUT_MS`
- `workers/image-generation/src/generation/errors.ts` — stage-aware sanitization (label or sibling helper)
- `workers/image-generation/src/providers/gemini-text.ts` (new) + tests — Flash `generateContent` / interactions text call, mocked fetch like `gemini.test.ts`
- `workers/image-generation/src/index.ts` — inject `refinePrompt`
- `workers/image-generation/src/consumer/consume-batch.ts`
- `workers/image-generation/src/consumer/consume-batch.test.ts`
- `workers/image-generation/src/persistence/job-store.ts` (+ tests if coverage requires)
- `src/routes/queue-jobs.tsx`
- `src/db/operations/warrior-portraits.server.ts` — comment currently says the Gemini adapter appends Blanche
- `docs/image-generation.md` — pipeline, no suffix, Gemini required for all jobs, `refined_prompt`

## Reuse

- Job lease: `claim` / `fail` / `release` / `complete` / `exhaust` in `workers/image-generation/src/persistence/job-store.ts`
- R2-before-pay and `storedResult` checks in `consume-batch.ts`
- `GenerationError` + fetch-intercepted SDK tests in `workers/image-generation/src/providers/gemini.ts` / `gemini.test.ts`
- `createImageGeneratorRegistry` secret checks as the pattern for a missing Gemini key
- `@google/genai` already on the worker; `GEMINI_API_KEY` already in `env.d.ts`
- Producer snapshots: `buildWarriorPortraitPrompt`, `buildEventImagePrompt`, `buildMatchImagePrompt`

## Steps

- [ ] Add nullable `refined_prompt`; generate migration; apply in test-support migration lists.
- [ ] Add `recordRefinedPrompt` on the job store (owned-row only).
- [ ] Replace `prepareImagePrompt` with refinement instructions; cover in `prompt.test.ts`.
- [ ] Add Gemini Flash text adapter: timeout, `maxRetries: 0`, empty-output permanent fail, sanitized errors, no prompt/body logging.
- [ ] Inject `refinePrompt` into `ConsumerDependencies`; call it only on a paid generation path; persist refined text; pass **exactly** that string to `generator.generate`.
- [ ] Permanent-fail the job on refinement errors; never call the image generator.
- [ ] Show `refined_prompt` on `/queue-jobs`.
- [ ] Update docs and the warrior-portrait Blanche comment.
- [ ] Tests and repo checks below.

## Verification

**Consumer orchestration** (`consume-batch.test.ts`):

- Refiner is called with the raw D1 prompt, then `generate` is called with the refiner return value (not the Blanche-suffixed string).
- Happy path writes `refined_prompt` and completes.
- Refiner throw → status `failed`, sanitized `error`, **no** `generate`, message acked.
- Raw refiner/provider exception text does not land in D1 or `console.error`.
- Existing R2 recovery still skips both refine and generate.
- Disabled generation still fails without refine or generate.

**Adapter:** mocked fetch; model id; instruction + user prompt shape; HTTP sanitization; timeout signal; empty output.

**App:** `/queue-jobs` renders refined prompt when present, em dash when null.

**Checks:** `pnpm check`, `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm consumer:check`.

## Out of scope

- Queue retries / fallback if Gemini Flash is down
- Richer logging of refinement
- Changing producer snapshot builders or the 4000-char input cap
- Showing refined prompts on `/generated-images` or warrior/event UI
- Reusing a previous `refined_prompt` instead of re-refining after an image retry
