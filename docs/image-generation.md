# Image generation producer

This is a producer-only scaffold in the existing TanStack Start Worker. The `/queue` playground provides a minimal submission UI. No consumer, image provider, R2 bucket, or Cloudflare Workflows resource is added.

## Flow

1. Call `createImageGenerationJob` (a TanStack Start POST RPC endpoint).
2. Validate and trim the prompt (1–4,000 characters).
3. Insert an `image_generation_jobs` D1 row with status `pending`.
4. Await `IMAGE_GENERATION_QUEUE.send({ jobId })`. The prompt stays in D1.
5. Mark the row `queued` and return `{ jobId, status: "queued" }`.
6. If sending throws, record `enqueue_failed` with a generic error and return `{ jobId, status: "enqueue_failed" }` instead.

Example call from app code:

```ts
import { createImageGenerationJob } from "@/server/image-generation";

const result = await createImageGenerationJob({
  data: { prompt: "A grim woodcut portrait of a Mordheim mercenary" },
});
// Check result.status; receiving a response alone does not imply enqueue success.
```

There is no hand-written REST URL: Start exposes the server function as its generated RPC endpoint.

## Local review

```sh
pnpm db:migrate:local
pnpm dev
```

Open `/queue`, enter a prompt, and click **Send to queue**. The page displays the job ID and enqueue outcome. You can also call the function from application code as above. Then inspect D1:

```sh
pnpm exec wrangler d1 execute mordheim-two-db --local --command "SELECT * FROM image_generation_jobs ORDER BY created_at DESC LIMIT 10"
```

The Cloudflare Vite plugin supplies a local queue binding; local sends do not send production messages. No consumer is registered, so jobs will not generate images or advance beyond `queued`.

## Dashboard verification

After provisioning and deploying, submit a prompt on the deployed `/queue` route. In the Cloudflare dashboard, open `mordheim-image-generation` under Queues and check message writes and backlog (analytics may take time to update). With no consumer, messages remain until retention expires. Inspect the `image_generation_jobs` table in the D1 console to match the displayed job ID to its prompt and status. The queue message contains only `{ jobId }`, not the prompt.

Local development uses simulated bindings and will not appear in the Cloudflare dashboard.

## Provisioning (not performed by this change)

```sh
pnpm exec wrangler queues create mordheim-image-generation
pnpm db:migrate:remote
pnpm deploy
```

Worker binding types are checked in; regenerate with `pnpm cf-typegen` after changing bindings.

## Deliberate limitations

- Like the existing mutation endpoints, this scaffold has no application authentication. Add authorization and rate limiting before exposing it publicly or connecting paid generation.
- D1 and Queues are not one atomic transaction. A crash can leave a `pending` row, including after a successful send. A send error may also mean delivery is uncertain. `queued` means the send was acknowledged, not that the message still exists or generation completed.
- If the post-send D1 update fails, the endpoint throws but the message may already be queued. There is no automatic resend or reconciliation. Repeating the request creates a new job.
- Queue retention still applies without a consumer; D1 records outlive expired messages. Do not enqueue real work expecting indefinite storage.
- A future consumer should load the prompt by `jobId`, handle duplicate delivery idempotently, and add processing/completed/failed states and result storage. Add reconciliation/request idempotency before production use.
