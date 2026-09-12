// @vitest-environment happy-dom

import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import type { MatchEventRow } from "@/db-collections/projections";
import { MatchEventsTable } from "../match-events-table";

const testState = vi.hoisted(() => ({
	dataTableProps: undefined as Record<string, unknown> | undefined,
	navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("@tanstack/react-router")>();
	return {
		...original,
		useNavigate: () => testState.navigate,
	};
});

vi.mock("../data-table", async (importOriginal) => {
	const original = await importOriginal<typeof import("../data-table")>();
	return {
		...original,
		DataTable: (props: Record<string, unknown>) => {
			testState.dataTableProps = props;
			return null;
		},
	};
});

const event: MatchEventRow = {
	id: "event-1",
	matchId: "match-1",
	attackerWarbandId: "warband-1",
	attackerWarriorId: "warrior-1",
	attackerName: "Reikland Reavers",
	attackerWarriorName: "Rolf",
	defenderWarbandId: "warband-2",
	defenderWarriorId: "warrior-2",
	defenderName: "Sisters of Sigmar",
	defenderWarriorName: "Marta",
	notes: null,
	outcome: null,
	resolvedAt: null,
	voidedAt: null,
	voidReason: null,
	isProcessed: false,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("MatchEventsTable actions", () => {
	beforeEach(() => {
		testState.dataTableProps = undefined;
		testState.navigate.mockReset();
	});

	it("opens an event from the row and renders void as an accessible icon button", () => {
		renderToStaticMarkup(
			<MatchEventsTable events={[event]} onSetOutcome={vi.fn()} />,
		);

		const onRowAction = testState.dataTableProps?.onRowAction as (
			event: MatchEventRow,
		) => void;
		onRowAction(event);
		expect(testState.navigate).toHaveBeenCalledWith({
			to: "/events/$eventId",
			params: { eventId: "event-1" },
		});

		const columns = testState.dataTableProps?.columns as Array<{
			id?: string;
			cell?: (context: { row: { original: MatchEventRow } }) => ReactElement;
		}>;
		const actions = columns
			.find((column) => column.id === "actions")
			?.cell?.({ row: { original: event } }) as ReactElement<{
			children: ReactElement<{
				"aria-label": string;
				children: ReactElement<{ "aria-hidden": string }>;
				onPress: () => void;
				size: string;
				variant: string;
			}>;
		}>;
		const button = actions.props.children;

		expect(button.type).toBe(Button);
		expect(button.props).toMatchObject({
			"aria-label": "Void event for Rolf against Marta",
			size: "icon-xs",
			variant: "destructive",
		});
		expect(button.props.children.props["aria-hidden"]).toBe("true");

		button.props.onPress();
		expect(testState.navigate).toHaveBeenLastCalledWith({
			to: "/events/$eventId/delete",
			params: { eventId: "event-1" },
		});
	});
});
