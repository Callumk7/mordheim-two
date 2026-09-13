import { describe, expect, it } from "vitest";
import { getImageGroupStatus } from "@/components/match-image";
import type { GeneratedImageJob } from "@/components/shared/generated-image-status";

function job(status: GeneratedImageJob["status"]): GeneratedImageJob {
	return { error: null, jobId: status, status };
}

describe("getImageGroupStatus", () => {
	it("distinguishes partial completion when illustrations are ready, active, and failed", () => {
		expect(
			getImageGroupStatus([job("completed"), job("processing"), job("failed")]),
		).toBe(
			"1 of 3 illustrations is ready; 1 still generating; 1 could not be generated.",
		);
	});
});
