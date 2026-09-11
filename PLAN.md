# Image generation worker refactor and provider adapters

## Context

The Cloudflare Queue consumer in `workers/image-generation/` currently mixes provider-neutral orchestration with Gemini-specific constants, metadata, validation, and client setup. The goal is to make the worker easier to navigate and allow the active image provider to be selected through configuration, starting with Gemini and OpenAI, without changing queue/job orchestration.

## Approach

- Reorganize the worker into clear provider, consumer/orchestration, persistence, and shared image-contract modules.
- Define a small provider-neutral image generator contract whose result carries the bytes plus durable provider/model and media metadata needed by R2 and D1.
- Keep provider-specific SDK/API request construction, response decoding, and error mapping inside dedicated Gemini and OpenAI adapters.
- Persist the requested **model** on each D1 job. Supported model identifiers are `gemini-3.1-flash-image` and `gpt-image-2`; the adapter registry derives the provider from the model.
- The `/queue` playground exposes those models in a design-system `Select`. Input validation defaults an omitted model to Gemini for backward compatibility, while warrior portrait and event image call sites explicitly pass the Gemini model so changing them later is a one-line code choice.
- Keep Queue messages minimal (`jobId` only). After claiming a job, the consumer reads its persisted model and obtains the corresponding configured adapter from a registry/factory composed at the Worker entry.
- Move the existing `Create the image in the style of John Blanche.` suffix into one shared prompt function. It runs once before adapter dispatch, and both adapters send the resulting text unchanged.
- Preserve existing queue retry, leasing, deduplication, R2 conditional-write, and sanitized-error behavior.

## Files to modify

Critical scope:

- `workers/image-generation/src/index.ts`
- `workers/image-generation/src/consumer/consume-batch.ts` and colocated test (moved from `consumer.ts`)
- `workers/image-generation/src/persistence/job-store.ts` and colocated test (moved from `jobs.ts`)
- Shared generation contract, errors, prompt preparation, and JPEG validation under `workers/image-generation/src/generation/`
- `workers/image-generation/src/providers/registry.ts`, `gemini.ts`, `openai.ts`, and focused tests (replacing root `gemini.ts`)
- `workers/image-generation/src/env.d.ts`
- `workers/image-generation/.dev.vars.example`
- Worker test support/imports under `workers/image-generation/src/`
- `src/db/schema.ts`
- `src/db/validation/image-generation.ts`
- `src/db/operations/image-generation.server.ts` and affected tests/call sites
- `src/db/operations/warrior-portraits.server.ts`
- `src/db/operations/event-images.server.ts`
- `src/server/image-generation.ts`
- `src/routes/queue.tsx`
- `src/routes/queue-jobs.tsx`
- New generated Drizzle migration and metadata under `drizzle/`
- `package.json` and `pnpm-lock.yaml` for the official `openai` SDK
- `workers/image-generation/worker-configuration.d.ts` via type generation

## Reuse

- Preserve `consumeImageGenerationBatch` queue semantics from `workers/image-generation/src/consumer.ts`.
- Preserve `createJobStore`, lease ownership, and terminal-state behavior from `workers/image-generation/src/jobs.ts`.
- Generalize and reuse the JPEG safety checks currently in `decodeJpeg` in `workers/image-generation/src/gemini.ts`.
- Define supported model constants/types beside the existing `ImageGenerationInputSchema` in `src/db/validation/image-generation.ts`, giving the app, persistence layer, and Worker one source of truth.
- Reuse the existing `Select` primitives from `src/components/ui/select.tsx` and the field pattern already used in forms such as `src/components/warrior-form.tsx`.
- Continue using the existing `ImageGenerationMessageSchema` and minimal `{ jobId }` queue payload; model selection remains durable in D1 rather than duplicated in the message.
- Reuse the existing `resultModel` field for the actual selected model and add a requested `model` field to the job; existing rows migrate to a non-null Gemini model default.
- Use the official OpenAI SDK, which supports the Cloudflare Workers native-fetch runtime and the same explicit no-SDK-retry/timeout policy already applied to Gemini.

## Steps

- [x] Add shared supported-model constants/types and extend `ImageGenerationInputSchema` with a Gemini-defaulted model enum.
- [x] Add a non-null requested-model column to `image_generation_jobs`, with a database default of `gemini-3.1-flash-image` so historical rows migrate safely; generate the Drizzle SQL/snapshot metadata.
- [x] Refactor `enqueueImageGeneration` to accept a clear options object containing prompt, model, and optional association; persist the model before sending the unchanged `{ jobId }` message.
- [x] Pass `gemini-3.1-flash-image` explicitly from warrior portrait and event image jobs, and pass the validated dropdown choice from the playground server function.
- [x] Add the model dropdown to `/queue`, defaulted to Gemini, and show the requested model in `/queue-jobs`; replace Gemini-only explanatory copy with provider-neutral wording.
- [x] Reorganize Worker modules/directories around entrypoint, queue consumer, job store, shared generation behavior, and provider adapters while preserving public behavior.
- [x] Define a provider-neutral `ImageGenerator` contract with model identity, shared sanitized `GenerationError` handling, shared timeout/size constants, shared prompt preparation, and shared base64/JPEG validation.
- [x] Refactor Gemini behind that contract. It continues requesting a 1:1, 1K JPEG with SDK retries disabled, but no longer owns shared prompt or image-validation logic.
- [x] Implement the OpenAI adapter with the official SDK and `gpt-image-2`, requesting one `1024x1024` JPEG at `quality: "medium"`, disabling SDK retries, applying the shared timeout, decoding `b64_json`, and sanitizing HTTP/network/invalid-response errors consistently with Gemini.
- [x] Add a model-to-adapter registry. Instantiate/configure only the adapter selected for the claimed job so an unused provider’s missing secret cannot break another provider; unsupported persisted models fail safely.
- [x] Add `OPENAI_API_KEY` to Worker secret typings/example vars. A missing model input falls back to Gemini; a selected model with a missing corresponding secret records a sanitized generation failure rather than switching providers silently.
- [x] Make consumer storage/recovery model-aware: validate R2 object job/model metadata against the job’s requested model, persist it to the existing `resultModel`, and retain deterministic keys and conditional writes.
- [x] Reorganize and extend tests for input/defaults, persisted requested models, explicit automatic-job Gemini selection, provider registry dispatch, identical shared prompts, both SDK request/response shapes, OpenAI medium quality, image validation, storage/deduplication, retries, and missing/unknown configuration.
- [x] Update dependencies, example configuration, generated Worker bindings, and moved imports.

## Verification

- Run focused Vitest tests for the worker and image-generation server paths.
- Run `pnpm consumer:typegen` and `pnpm consumer:check`.
- Run repository quality gates: `pnpm format`, `pnpm lint`, `pnpm check`, and `pnpm test`.
- Manually run the worker locally once for each `/queue` model choice and confirm completed D1 rows and private R2 JPEG metadata identify the requested/actual model.
- Confirm warrior and event submissions persist the explicitly selected Gemini model.

## Decisions captured

- Model is selected per job and persisted in D1; adapter/provider is derived from it.
- Missing model input defaults to Gemini, while warrior/event call sites explicitly choose Gemini.
- OpenAI uses `gpt-image-2` at medium quality.
- Both providers receive the same shared prompt, including the existing John Blanche suffix.
- Existing R2 objects remain recoverable only when their metadata matches the job’s persisted requested model; mismatches remain permanent operator-inspection failures rather than being overwritten.
