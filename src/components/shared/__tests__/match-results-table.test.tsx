import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MatchResultRow } from "@/db-collections/projections/match-results";
import { MatchResultsTable } from "../match-results-table";

const row: MatchResultRow = {
	id: "red",
	name: "Red Reavers",
	faction: "Mercenaries",
	rank: 1,
	wins: 2,
	losses: 1,
	draws: 1,
	played: 4,
	winPercentage: 50,
};

describe("MatchResultsTable", () => {
	it("renders an accessible table with every result column", () => {
		const markup = renderToStaticMarkup(<MatchResultsTable rows={[row]} />);

		expect(markup).toContain('aria-label="Campaign match results"');
		expect(markup).toContain("Red Reavers");
		expect(markup).toContain("Mercenaries");
		for (const heading of [
			"Rank",
			"Warband",
			"Wins",
			"Losses",
			"Draws",
			"Played",
			"Win percentage",
		]) {
			expect(markup).toContain(heading);
		}
		expect(markup).toContain("50%");
	});

	it("renders a useful empty state when no completed results exist", () => {
		const markup = renderToStaticMarkup(
			<MatchResultsTable
				rows={[{ ...row, wins: 0, losses: 0, draws: 0, played: 0 }]}
			/>,
		);

		expect(markup).toContain("No match results yet");
		expect(markup).toContain("Complete a match");
		expect(markup).not.toContain('aria-label="Campaign match results"');
	});
});
