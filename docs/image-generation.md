# Gemini image generation queue

One repository, two independently built/deployed Workers. The app sends `{ jobId }`; the consumer loads the prompt from shared D1, generates a JPEG, writes private R2, then records completion in D1 **before acknowledging**. The app now lists completed jobs at `/generated-images` and streams their JPEGs through `/api/generated-images/<jobId>`. The bucket itself remains private.

## Safe defaults and authorization

**`IMAGE_GENERATION_ENABLED` defaults to the string `"false"` on the consumer.** Only exact `"true"` enables new provider requests. With generation disabled, valid new deliveries become **`failed` in D1 and are acknowledged/discarded**, with a disabled error. They are not a paused backlog. Enabling later does **not** regenerate these jobs; submit a new job intentionally. Existing R2 results can still be recovered while disabled.

The app's submission RPC, `/queue-jobs` diagnostic RPC, `/generated-images` listing RPC and image GET endpoint currently have **no application authentication**, deliberately accepted for this spike. The listings expose prompts and the GET endpoint exposes images to anyone who can reach the app; a private R2 bucket does not make these endpoints private. Before production enablement:

- Protect the **entire app, including server-function/RPC paths**, with Cloudflare Access and an authorized-user policy, or implement verified server-side authorization and rate limiting. Protecting only `/queue` or hiding its button is insufficient.
- Close alternate origins (`workers.dev`, preview URLs, unprotected custom domains) that could bypass that policy. Verify anonymous direct RPC requests are denied.
- Restrict who can write to the queue, budget/quota the provider key, set spending alerts, and review any existing backlog. Concurrency one is not rate limiting or authorization.
- Keep the R2 bucket private: no `r2.dev`, public domain, or public ACL. Protect the gallery listing RPC and `/api/generated-images/*` as well as submission paths before using private data. Image ownership/authorization remains outside the spike.

The flag is a deliberate opt-in safety switch, **not** an authorization system. Do not turn it on for the current unprotected public producer.

## Request and storage contract

`workers/image-generation/src/gemini.ts` uses installed `@google/genai` 2.21.0 directly:

```ts
client.interactions.create({
  model: "gemini-3.1-flash-image",
  input: prompt,
  stream: false,
  store: false,
  response_format: {
    type: "image", mime_type: "image/jpeg", aspect_ratio: "1:1", image_size: "1K",
  } satisfies Interactions.ImageResponseFormat,
}, { maxRetries: 0, timeout: 120_000, signal: AbortSignal.timeout(120_000) })
```

The response format is checked against the SDK's narrow `Interactions.ImageResponseFormat` type (imported from `@google/genai`), which currently permits JPEG MIME only; the enclosing response-format union also allows arbitrary dictionaries and is insufficient to validate image options.

The adapter requires a completed interaction with final `output_image` inline data. It does not use thought/intermediate images, follow provider URIs, or write runtime filesystem files. It validates JPEG MIME, base64 decoding, JPEG start/end markers with nonempty content, and a 10 MiB byte/encoded-size cap. This is not a full JPEG parser. Prompt and image processing remain in memory. `store: false` disables interaction history storage, not Google's overall API data-use terms.

The SDK has a separate Interactions retry layer; `maxRetries: 0` explicitly disables its default retries. HTTP error handling validates numeric `status` because this SDK's internal Interactions APIError is not the exported `ApiError` class. Tests exercise the real SDK with intercepted fetch, not a pretend API cast. Provider requests have a 120-second abort, including response consumption. An abort cannot guarantee cancellation of work already running at Google.

R2 key: `image-generation/<jobId>.jpg`. The consumer writes `image/jpeg` HTTP metadata and `jobId`/model custom metadata, using conditional `etagDoesNotMatch: "*"` so an existing result is never overwritten. D1 completion stores key, MIME, bytes, ETag, model and completion time. Recovery validates R2 key, MIME, size and custom metadata; it trusts the private bucket's worker-written object rather than downloading it again. Restrict bucket writers and avoid lifecycle deletion of results during retries.

## State, duplicate delivery and recovery

1. Producer inserts `pending`, sends the ID, then updates **only pending rows** to `queued` or `enqueue_failed`. The send and D1 are not transactional; uncertain delivery can still arrive. A consumer state is never overwritten by the producer.
2. Consumer atomically claims `pending`, `queued`, `enqueue_failed`, or expired `processing` using one conditional D1 UPDATE with a random ownership token and lease. Only one concurrent claimant obtains the prompt. Completion/failure/release updates require that token.
3. Lease duration is **16 minutes**, longer than Queues' **15-minute maximum invocation wall time**. An old invocation cannot still write after a new claim is eligible. Keep this invariant if runtime/config limits change; the concurrency cap alone is not duplicate protection.
4. Live lease conflicts call `retry({ delaySeconds: 960 })`, **not** the default 30-second retry. This leaves enough time for any current lease to expire before another delivery consumes a retry, including a crashed owner. No lease conflict is acknowledged. A conflict on the final delivery can still land in the DLQ while D1 remains processing: never mark another live owner's work failed just to exhaust a duplicate.
5. Under ownership, R2 HEAD is checked **before** any paid request. If an object exists (including an uncertain prior PUT or an R2-success/D1-failure crash), persist completion without generating again. Otherwise generate, conditionally store R2, then persist completion. Only then acknowledge.
6. `completed` duplicates acknowledge without touching the provider or R2. Historical `consumed` rows remain receipt-only; `failed` rows also remain terminal. Neither is automatically regenerated, including on manually replayed messages. No backfill/reconciliation scan is added.

**This is not exactly-once paid generation.** A crash, timeout, or R2 failure after Google accepted/completed generation but before R2 durably stores the bytes can lose the response. A later delivery may incur another charge. D1 leases prevent concurrent normal calls, not this external side-effect window. There is no assumed provider idempotency key. Queue delivery retries are capped, but an operator resubmission is a new paid job.

## Failure policy and DLQ

- Retryable: network/timeout; provider HTTP 401/403 (configuration may be repaired), 408/409/429, 5xx; missing key; D1 and R2 failures. Persist sanitized error/release ownership where possible and **retry, never ack** the failing delivery. Releasing a known finished attempt leaves `processing` with an expired lease for the next attempt.
- Permanent: other provider 4xx, non-completed/no-image response, invalid JPEG, invalid existing object metadata. Persist `failed` and **ack only after that D1 write succeeds**. These failures do not go to the DLQ. Disabled generation follows the same durable-failure/ack policy.
- Invalid payloads and missing D1 jobs retry into the existing DLQ, never invent a job.
- The consumer uses batch size **1**, concurrency **1**, three retries (four deliveries total), default retry delay **30 seconds**, DLQ `mordheim-image-generation-dlq`. Keep `MAX_DELIVERY_ATTEMPTS = 4` aligned with Wrangler `max_retries = 3`.
- On final retryable failure, write `failed` and an exhaustion error where D1/ownership permits, **then still retry** to route the delivery to the DLQ. A final pre-claim failure gets a best-effort conditional exhaustion update that replaces any earlier error with a sanitized exhaustion message. Never overwrite completed, historical, or live-owned work. If D1 is unavailable or the invocation crashes, status can remain stale; the DLQ is operational evidence, not an automatic D1 projection.

No DLQ consumer or replay automation is installed. Inspect the message ID, D1 status/lease and deterministic R2 object before any replay/resubmission. Terminal failed jobs are intentionally not revived by queue replay. In particular, a stored image with a final D1 failure can require an **operator-reviewed repair of D1 from verified R2 metadata**; blindly submitting a new job may spend again. An expired processing job can be explicitly replayed after checking it is not live. Missing/invalid messages need repair rather than blind replay. Observe queue/DLQ retention windows; neither is permanent archival storage.

Only generic failure metadata plus message ID/attempt count are logged. Do not enable SDK HTTP debug logging or log raw errors, prompts, keys, image data or provider response bodies.

## Files and independent rollout

- `src/server/image-generation.ts`: existing producer and pending-only race guards.
- `src/db/schema.ts`, `drizzle/0012_tense_echo.sql`: additive nullable lease/result columns; unconstrained TEXT status adds processing/completed/failed at the TypeScript layer. Existing rows are unchanged.
- `workers/image-generation/src/{index,consumer,jobs,gemini}.ts`: worker binding composition, delivery policy, atomic D1 state, provider adapter.
- `workers/image-generation/wrangler.jsonc`: consumer R2 binding/flag and queue configuration.
- `wrangler.jsonc`: app R2 binding to the same `mordheim-generated-images` bucket; no public bucket access or generation flag is added.
- `/queue`, `/queue-jobs`: enqueue feedback and D1 status/result metadata, with links to the gallery.
- `/generated-images`: latest 100 completed D1 jobs, ordered by completion time then ID descending, with prompts, UTC completion times, lazy-loaded JPEGs, accessible enlargement dialogs and manual refresh. Missing images have a retry-through-refresh placeholder; queued/failed/historical consumed jobs are omitted. No bucket listing, orphan recovery, polling, upload, delete or regenerate controls.
- `src/server/generated-images.server.ts`, `src/server/generated-images.ts`, `/api/generated-images/$jobId`: completed-job query and unprotected image streaming. GET resolves the job's deterministic result key in D1, returns 404 for missing/noncompleted jobs or missing objects, and sanitized 503 for D1/R2 failures (502 for non-JPEG metadata). Responses use `no-store`; arbitrary bucket keys are not accepted.

**Apply the schema migration first. Then app and consumer GitHub builds can deploy independently in either order.** The old guarded producer works with the new consumer; the new app works with the receipt-only consumer (showing consumed and no result). The app now needs its R2 binding on deployment but still needs no Gemini secret. The gallery can be deployed independently of the consumer and requires no new migration beyond the existing result columns. `vite.config.ts` keeps the consumer auxiliary Worker development-only, not coupled to the app production bundle. Avoid rolling back to the receipt-only consumer after generation is enabled: it is not a safe generation retry handler.

## Local review (no paid requests)

```sh
pnpm db:migrate:local
cp workers/image-generation/.dev.vars.example workers/image-generation/.dev.vars
pnpm dev
```

Keep the example flag false and API key empty. The development-only Vite auxiliary Worker shares the root local D1/R2/queue runtime; do not start an unrelated second consumer process. Submit at `/queue`, refresh `/queue-jobs`, and expect `failed` with the disabled explanation. Local queue/R2/D1 operations stay local; **true + a real Gemini key makes paid Internet calls even in local development**.

### Local gallery fixture (no queue or paid requests)

With `pnpm dev` stopped, run:

```sh
pnpm db:migrate:local
node scripts/seed-generated-image-local.mjs
pnpm dev
```

The script writes a one-pixel JPEG and the fixed `local-gallery-fixture` completed job to **local** R2/D1 only, using explicit `--local` flags. It is safe to rerun; only that fixture's completion time and object are refreshed. It never submits to the queue, reads a provider key, or writes production data. The root Wrangler and Vite runtime share default `.wrangler/state` persistence; do not add `remote: true` bindings. Local results do not appear in deployed storage and vice versa.

Open `/generated-images`, check the fixture's prompt/time, enlarge it, close with Escape, and refresh. Follow the links from `/queue` and `/queue-jobs`. To exercise missing-object handling, stop dev and run `pnpm exec wrangler r2 object delete mordheim-generated-images/image-generation/local-gallery-fixture.jpg --local`, restart dev and refresh; expect the unavailable placeholder. Rerun the fixture script to restore it. Test empty state before seeding in a fresh local database. Deployed verification uses existing completed jobs after deploying the updated app binding; this fixture script has no remote mode.

```sh
pnpm test
pnpm format
pnpm lint
pnpm check
pnpm exec tsc --noEmit
pnpm exec tsc --noEmit -p workers/image-generation/tsconfig.json
pnpm consumer:check   # Wrangler dry-run only
pnpm build           # app build, no deploy
pnpm consumer:typegen
```

Tests use real SQLite with additive migrations, D1-compatible SQL adapter, in-memory R2 doubles and the real Gemini SDK with mocked fetch. They cover ordering, race guards, leases, duplicates, provider failure/no-image/validation, D1/R2 retries/recovery and terminal policies. They do not prove deployed queue scheduling, actual Gemini model availability, live R2 conditional semantics or production Access configuration.

## Manual setup (not performed by this change)

After reviewing authorization and rollout prerequisites, an operator may run:

```sh
# Only if these resources do not already exist:
pnpm exec wrangler queues create mordheim-image-generation
pnpm exec wrangler queues create mordheim-image-generation-dlq
pnpm exec wrangler r2 bucket create mordheim-generated-images

# Required before either updated Worker build is deployed:
pnpm db:migrate:remote

# Secret belongs ONLY to the consumer. Interactive input, never a CLI value:
pnpm exec wrangler secret put GEMINI_API_KEY --config workers/image-generation/wrangler.jsonc

# Leave IMAGE_GENERATION_ENABLED false for initial deployment:
pnpm consumer:deploy
pnpm deploy
```

Consumer binding types are generated with `--strict-vars false` so environment overrides can be strings; the optional secret is separately typed in `src/env.d.ts`. `.dev.vars` and environment-specific variants are gitignored; only the empty example is committed.

Once **all submission paths are protected**, backlog reviewed and quota/spending controls installed, explicitly change the consumer Wrangler `IMAGE_GENERATION_ENABLED` to `"true"` and redeploy the consumer. Do not use an app `VITE_` variable or commit a provider key. Verify with one intentional new job and monitor D1, R2 and DLQ. This documentation lists operator commands only; implementation validation does not create buckets, migrate remote D1, deploy, or call a paid provider.

References: [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation), [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [Queues limits](https://developers.cloudflare.com/queues/platform/limits/), [Queues retries](https://developers.cloudflare.com/queues/configuration/batching-retries/), [Vite auxiliary Workers](https://developers.cloudflare.com/workers/vite-plugin/reference/api/).
