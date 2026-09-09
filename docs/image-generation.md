# Image generation queue scaffold

One repository, two independently deployed Workers:

```text
wrangler.jsonc                            # TanStack Start app / producer
src/server/image-generation.ts            # Submission RPC
src/db/schema.ts                          # Shared D1 schema
src/db/validation/image-generation.ts      # Shared message contract
workers/image-generation/
  wrangler.jsonc                          # Consumer bindings, retries, DLQ
  tsconfig.json
  worker-configuration.d.ts                # Generated consumer bindings
  src/index.ts                            # Queue entrypoint, Drizzle connection
  src/consumer.ts                         # Message handling scaffold
  src/consumer.test.ts                     # Injected-loader unit tests
```

The consumer imports shared schema/validation, not the app's TanStack server functions or `getDb()`. It creates its own Drizzle connection using its own `env.DB` binding to the same database. No separate package install or repository is required.

## What this scaffold does (and does not do)

**The consumer persists `consumed` in D1 before acknowledging a valid message. It does not generate images. Do not deploy it against a backlog you intend to actually generate.** No provider, R2 bucket, or paid API calls are configured. `consumed` means durable receipt, not generation completion.

1. `createImageGenerationJob` validates/trims a prompt (1–4,000 characters).
2. The app inserts a D1 job with status `pending`, then sends `{ jobId }`. The prompt stays in D1.
3. The app records `queued` when send succeeds, or `enqueue_failed` with a generic error if sending throws.
4. The consumer validates the message and atomically updates the matching D1 row to `consumed`, clears any enqueue error, and sets `updatedAt`. It accepts `pending` and `enqueue_failed` too: delivery can race the producer update, and a send failure may mean delivery is uncertain.
5. Only after D1 confirms the row exists and the update succeeds does it log the job ID and acknowledge. Duplicate deliveries preserve the original receipt timestamp. Producer updates only touch `pending` rows, so they cannot overwrite `consumed`.
6. Invalid payloads, missing jobs, and D1 errors are retried individually. Other messages in the batch continue. After three retries, Cloudflare moves the message to `mordheim-image-generation-dlq`.

The consumer processes messages sequentially, with batches of up to five and consumer concurrency capped at one. These are conservative starting settings, not a production throughput recommendation. Duplicate deliveries are idempotent for receipt tracking (logs may repeat); this is not an exactly-once generation implementation.

## Local review

```sh
pnpm db:migrate:local
pnpm dev
```

`vite.config.ts` registers the consumer as a **development-only auxiliary Worker**, so both Workers and their queue run in the same local runtime. They share the default root `.wrangler/state` D1 persistence. Do not start a second standalone consumer dev process expecting it to connect automatically.

Open `/queue` and submit a prompt. The page displays the job ID and enqueue outcome; the dev terminal should show `Image generation scaffold consumed job` with that ID. Open `/queue-jobs` and refresh: D1 should show `consumed` with the receipt time in Updated. Local messages never go to the production queue or dashboard.

```sh
pnpm exec wrangler d1 execute mordheim-two-db --local --command "SELECT * FROM image_generation_jobs ORDER BY created_at DESC LIMIT 10"
pnpm test
pnpm consumer:check
```

`consumer:check` bundles and validates the consumer with Wrangler's dry run; it does not deploy. Unit tests cover validation, lookup, per-message acknowledgements/retries, batch isolation, and duplicate delivery. Cloudflare's actual retry scheduling/DLQ routing requires runtime verification.

## Provisioning and deployment (manual; not performed by this change)

Create the queues if they do not already exist:

```sh
pnpm exec wrangler queues create mordheim-image-generation
pnpm exec wrangler queues create mordheim-image-generation-dlq
pnpm db:migrate:remote
pnpm consumer:deploy
pnpm deploy
```

`consumer:deploy` uses the consumer's own Wrangler configuration and registers its queue subscription. `deploy` still builds/deploys only the web app. The consumer has no public HTTP endpoint (`workers_dev` and preview URLs are disabled, with no routes or fetch handler).

Regenerate binding types after configuration changes:

```sh
pnpm cf-typegen
pnpm consumer:typegen
```

After deploying, inspect consumer logs and the main queue/DLQ in Cloudflare. Successful scaffold consumption drains the main queue and records `consumed` in D1. No DLQ consumer is configured: inspect and arrange replay explicitly, before its retention window expires.

## Rolling out receipt tracking

Deploy the app first (`pnpm deploy`) to install the producer's race guards, then the consumer (`pnpm consumer:deploy`). No SQL migration is needed for `consumed`: the existing status column is unconstrained TEXT; the Drizzle enum change is TypeScript-only. If GitHub builds deploy both independently, ensure the guarded producer is live before sending test jobs.

Previously acknowledged messages cannot be recovered from the main queue, so old rows may remain `queued`. Do not backfill these as consumed without evidence; submit a new job to verify the new flow.

## Before real generation

- Replace the marked scaffold block in `workers/image-generation/src/consumer.ts` with a provider adapter and durable result storage. Acknowledge only after persisting the result.
- Add processing/completed/failed state, durable duplicate protection and recovery of interrupted work. Use `jobId` as a provider idempotency key where supported. A concurrency cap is not an idempotency mechanism.
- Keep the producer's pending-only update guards when adding processing/completed states.
- Configure provider secrets and R2 bindings on the consumer, not the frontend. Do not log prompts or credentials.
- Add authentication, authorization and rate limiting to the submission endpoint before exposing paid generation.
- D1 and Queues are not an atomic transaction. A crash can leave a pending row or an uncertain delivery; add reconciliation/request idempotency before production use. Retrying the current RPC creates a new job.
- Add monitoring and a DLQ inspection/replay procedure. Queue retention applies to both queues; the DLQ is not permanent storage.

References: [Queues local development](https://developers.cloudflare.com/queues/configuration/local-development/), [Vite auxiliary Workers](https://developers.cloudflare.com/workers/vite-plugin/reference/api/), [Retries and acknowledgements](https://developers.cloudflare.com/queues/configuration/batching-retries/).
