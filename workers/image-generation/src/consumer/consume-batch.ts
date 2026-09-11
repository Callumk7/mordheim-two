import {
	ImageGenerationMessageSchema,
	type ImageGenerationModel,
	ImageGenerationModelSchema,
} from "@/db/validation/image-generation";
import { MAX_IMAGE_BYTES } from "../generation/config";
import { GenerationError } from "../generation/errors";
import { prepareImagePrompt } from "../generation/prompt";
import type { GetImageGenerator } from "../generation/types";
import {
	type ImageResult,
	type JobStore,
	LEASE_MS,
	MAX_DELIVERY_ATTEMPTS,
} from "../persistence/job-store";

type ImageBucket = Pick<R2Bucket, "head" | "put">;
export interface ConsumerDependencies {
	jobs: JobStore;
	bucket: ImageBucket;
	enabled: boolean;
	getGenerator: GetImageGenerator;
}

export const imageKey = (jobId: string) => `image-generation/${jobId}.jpg`;

function storedResult(
	object: R2Object,
	jobId: string,
	model: ImageGenerationModel,
): ImageResult {
	if (
		object.key !== imageKey(jobId) ||
		object.httpMetadata?.contentType !== "image/jpeg" ||
		object.size <= 5 ||
		object.size > MAX_IMAGE_BYTES ||
		object.customMetadata?.jobId !== jobId ||
		object.customMetadata?.model !== model
	) {
		// Do not overwrite an unexpected existing object or spend to replace it.
		throw new GenerationError(
			"Stored image metadata is invalid; operator inspection required.",
			true,
		);
	}
	return {
		resultKey: object.key,
		resultMimeType: "image/jpeg",
		resultBytes: object.size,
		resultEtag: object.etag,
		resultModel: model,
	};
}

async function processJob(
	jobId: string,
	attempts: number,
	dependencies: ConsumerDependencies,
) {
	const { jobs, bucket, getGenerator, enabled } = dependencies;
	const token = crypto.randomUUID();
	const job = await jobs.claim(jobId, token);
	if (!job) {
		const existing = await jobs.load(jobId);
		if (!existing) throw new Error("Job missing");
		// Historical receipts and terminal failures are not generation requests.
		if (["completed", "consumed", "failed"].includes(existing.status)) return;
		// Another invocation owns the job. Never acknowledge its outstanding work.
		return { delaySeconds: Math.ceil(LEASE_MS / 1000) };
	}

	let stage = "Image model validation failed.";
	try {
		const parsedModel = ImageGenerationModelSchema.safeParse(job.model);
		if (!parsedModel.success) {
			throw new GenerationError("Unsupported image generation model.", true);
		}
		const model = parsedModel.data;
		stage = "R2 lookup failed.";
		const key = imageKey(jobId);
		let object = await bucket.head(key);
		if (!object) {
			if (!enabled) {
				stage = "D1 disabled-job persistence failed.";
				await jobs.fail(
					jobId,
					token,
					"Generation disabled; submit a new job after authorized enablement.",
				);
				return;
			}
			stage = "Image provider request failed.";
			const generator = getGenerator(model);
			const bytes = await generator.generate(prepareImagePrompt(job.prompt));
			stage = "R2 image storage failed.";
			object = await bucket.put(key, bytes, {
				httpMetadata: { contentType: "image/jpeg" },
				customMetadata: { jobId, model },
				// An uncertain previous PUT must never be overwritten on retry.
				onlyIf: { etagDoesNotMatch: "*" },
			});
			if (!object) object = await bucket.head(key);
			if (!object) throw new Error("R2 did not confirm storage");
		}
		const result = storedResult(object, jobId, model);
		stage =
			"D1 result persistence failed; stored image can be recovered on retry.";
		await jobs.complete(jobId, token, result);
	} catch (error) {
		const detail = error instanceof GenerationError ? error.message : stage;
		if (error instanceof GenerationError && error.permanent) {
			await jobs.fail(jobId, token, detail);
			return;
		}
		if (attempts >= MAX_DELIVERY_ATTEMPTS) {
			await jobs.fail(
				jobId,
				token,
				`${detail} Delivery retries exhausted; inspect DLQ and R2.`,
			);
		} else {
			await jobs.release(jobId, token, detail);
		}
		throw new Error("Retryable image job failure");
	}
}

export async function consumeImageGenerationBatch(
	batch: MessageBatch<unknown>,
	dependencies: ConsumerDependencies,
) {
	for (const message of batch.messages) {
		const parsed = ImageGenerationMessageSchema.safeParse(message.body);
		try {
			if (!parsed.success) throw new Error("Invalid message");
			const retry = await processJob(
				parsed.data.jobId,
				message.attempts,
				dependencies,
			);
			if (retry) message.retry(retry);
			else message.ack(); // Only after durable completion/failure or known terminal dedupe.
		} catch {
			if (parsed.success && message.attempts >= MAX_DELIVERY_ATTEMPTS) {
				try {
					await dependencies.jobs.exhaust(parsed.data.jobId);
				} catch {
					// D1 may be unavailable; preserve delivery to the DLQ regardless.
				}
			}
			console.error("Image generation message failed; retrying", {
				messageId: message.id,
				attempts: message.attempts,
			});
			message.retry();
		}
	}
}
