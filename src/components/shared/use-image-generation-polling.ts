import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export const ACTIVE_IMAGE_JOB_STATUSES = [
	"pending",
	"queued",
	"processing",
] as const;

const POLL_INTERVAL_MS = 3_000;
const POLL_CEILING_MS = 120_000;

type PollingRouter = {
	invalidate: (options: { sync: true }) => Promise<unknown>;
};

type PollingCoordinator = {
	interval: ReturnType<typeof setInterval> | null;
	router: PollingRouter;
	subscribers: Set<symbol>;
};

const coordinators = new WeakMap<object, PollingCoordinator>();

export function isActiveImageJobStatus(status: string) {
	return ACTIVE_IMAGE_JOB_STATUSES.some((active) => active === status);
}

function stopWhenIdle(coordinator: PollingCoordinator) {
	if (coordinator.subscribers.size > 0 || coordinator.interval === null) return;
	clearInterval(coordinator.interval);
	coordinator.interval = null;
}

function subscribe(router: PollingRouter) {
	const key = router as object;
	let coordinator = coordinators.get(key);
	if (!coordinator) {
		coordinator = { interval: null, router, subscribers: new Set() };
		coordinators.set(key, coordinator);
	}

	const subscriber = Symbol("image-generation-poll");
	coordinator.subscribers.add(subscriber);
	if (coordinator.interval === null) {
		coordinator.interval = setInterval(() => {
			void coordinator?.router
				.invalidate({ sync: true })
				.catch(() => undefined);
		}, POLL_INTERVAL_MS);
	}

	const ceiling = setTimeout(() => {
		coordinator?.subscribers.delete(subscriber);
		if (coordinator) stopWhenIdle(coordinator);
	}, POLL_CEILING_MS);

	return () => {
		clearTimeout(ceiling);
		coordinator?.subscribers.delete(subscriber);
		if (coordinator) stopWhenIdle(coordinator);
	};
}

/**
 * Polls route loaders while at least one mounted image surface has an active
 * job. A coordinator keyed by router instance gives concurrent surfaces one
 * shared invalidation interval.
 */
export function useImageGenerationPolling(isActive: boolean) {
	const router = useRouter() as PollingRouter;
	useEffect(() => {
		if (!isActive) return;
		return subscribe(router);
	}, [isActive, router]);
}
