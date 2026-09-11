// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MatchCompletionDialog } from "@/components/shared/match-completion-dialog";
import type { EventOutcome } from "@/db/validation/event";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("@/components/ui/dialog", () => ({
	Dialog: ({
		children,
		isOpen,
	}: {
		children: React.ReactNode;
		isOpen: boolean;
	}) => (isOpen ? <div role="dialog">{children}</div> : null),
	DialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p>{children}</p>
	),
	DialogFooter: ({ children }: { children: React.ReactNode }) => (
		<footer>{children}</footer>
	),
	DialogHeader: ({ children }: { children: React.ReactNode }) => (
		<header>{children}</header>
	),
	DialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h1>{children}</h1>
	),
}));

vi.mock("@/components/event-form", () => ({
	EventForm: ({ initialValues, onSubmit }: Record<string, unknown>) => (
		<button
			onClick={() =>
				void (onSubmit as (values: unknown) => Promise<void>)(initialValues)
			}
			type="button"
		>
			Save final event
		</button>
	),
}));

vi.mock("@/components/table/match-events-table", () => ({
	MatchEventsTable: ({ events, onSetOutcome }: Record<string, unknown>) => (
		<section aria-label="Match events">
			{(events as Array<{ id: string; attackerWarriorName: string }>).map(
				(event) => (
					<div key={event.id}>
						<span>{event.attackerWarriorName}</span>
						{(["Injury", "Death", "Recovery"] as EventOutcome[]).map(
							(outcome) => (
								<button
									key={outcome}
									onClick={() =>
										void (
											onSetOutcome as (
												id: string,
												value: EventOutcome,
											) => Promise<void>
										)(event.id, outcome)
									}
									type="button"
								>
									{outcome} for {event.attackerWarriorName}
								</button>
							),
						)}
					</div>
				),
			)}
		</section>
	),
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
	container = document.createElement("div");
	document.body.append(container);
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
});

function button(label: string) {
	return [...container.querySelectorAll("button")].find((element) =>
		element.textContent?.includes(label),
	);
}

describe("MatchCompletionDialog", () => {
	it("shows match events, resolves injury/death outcomes, and adds a final event", async () => {
		const onAddEvent = vi.fn(async () => undefined);
		const onSetOutcome = vi.fn(async () => undefined);
		const initialEventValues = {
			matchId: "match-1",
			attackerWarbandId: "warband-a",
			attackerWarriorId: "warrior-a",
			defenderWarbandId: "warband-b",
			defenderWarriorId: "warrior-b",
			notes: null,
		};

		await act(async () => {
			root.render(
				<MatchCompletionDialog
					canAddEvent
					events={[
						{
							id: "event-1",
							attackerWarriorName: "Heinrich",
						} as never,
					]}
					initialEventValues={initialEventValues}
					isOpen
					match={{ id: "match-1", name: "The Last Stand" } as never}
					onAddEvent={onAddEvent}
					onOpenChange={vi.fn()}
					onSetOutcome={onSetOutcome}
					participants={[]}
					warbands={[]}
					warriors={[]}
				/>,
			);
		});

		expect(container.getAttribute("role")).toBeNull();
		expect(container.textContent).toContain("Complete The Last Stand");
		expect(container.textContent).toContain("Heinrich");

		await act(async () => button("Injury for Heinrich")?.click());
		await act(async () => button("Death for Heinrich")?.click());
		expect(onSetOutcome).toHaveBeenNthCalledWith(1, "event-1", "Injury");
		expect(onSetOutcome).toHaveBeenNthCalledWith(2, "event-1", "Death");

		await act(async () => button("Add event")?.click());
		expect(button("Save final event")).toBeDefined();
		await act(async () => button("Save final event")?.click());
		expect(onAddEvent).toHaveBeenCalledWith(initialEventValues);
		expect(button("Save final event")).toBeUndefined();
	});
});
