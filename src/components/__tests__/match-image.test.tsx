// @vitest-environment happy-dom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MatchImage } from "@/components/match-image";
import type { GeneratedImageJob } from "@/components/shared/generated-image-status";

vi.mock("@/components/shared/generated-image-status", () => ({
	GeneratedImageStatus: ({ label }: { label: string }) => <div>{label}</div>,
}));

const match = {
	status: "Completed",
	result: "Victory",
	winnerWarbandId: "warband-1",
	name: "The Last Stand",
} as never;

function imageJob(status: GeneratedImageJob["status"]): GeneratedImageJob {
	return { jobId: `job-${status}`, status, error: null };
}

function renderGroup(statuses: GeneratedImageJob["status"][]) {
	const [matchStatus, ...eventStatuses] = statuses;
	return renderToStaticMarkup(
		<MatchImage
			imagery={{
				match: imageJob(matchStatus),
				matchHistory: [imageJob(matchStatus)],
				events: Object.fromEntries(
					eventStatuses.map((status, index) => [
						`event-${index}`,
						imageJob(status),
					]),
				),
			}}
			match={match}
			winnerName="The Reavers"
		/>,
	);
}

describe("MatchImage composite status", () => {
	it("distinguishes all complete, all active, and all failed groups", () => {
		expect(renderGroup(["completed", "completed"])).toContain(
			"All 2 illustrations are ready",
		);
		expect(renderGroup(["queued", "processing"])).toContain(
			"2 illustrations are still generating",
		);
		expect(renderGroup(["failed", "enqueue_failed"])).toContain(
			"2 illustrations could not be generated",
		);
	});

	it("explicitly describes partial success with active and failed jobs", () => {
		const markup = renderGroup(["completed", "processing", "failed"]);
		expect(markup).toContain("1 of 3 illustrations is ready");
		expect(markup).toContain("1 still generating");
		expect(markup).toContain("1 could not be generated");
	});
});
