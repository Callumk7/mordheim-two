import {
	type Collection,
	eq,
	type InitialQueryBuilder,
	or,
} from "@tanstack/react-db";
import type { Event } from "@/db/validation/event";
import type { Warband } from "@/db/validation/warband";
import type { Warrior } from "@/db/validation/warrior";

type StringKeyedCollection<T extends object> = Collection<
	T,
	string,
	// biome-ignore lint/suspicious/noExplicitAny: Allows arbitrary collection utilities.
	any,
	// biome-ignore lint/suspicious/noExplicitAny: Allows arbitrary collection schemas.
	any,
	// biome-ignore lint/suspicious/noExplicitAny: Allows arbitrary collection insert inputs.
	any
>;

type WarriorCollections = {
	warriors: StringKeyedCollection<Warrior>;
};

type WarriorEventCollections = {
	events: StringKeyedCollection<Event>;
};

type WarriorWarbandCollections = {
	warbands: StringKeyedCollection<Warband>;
};

export function warriorsQuery({ warriors }: WarriorCollections) {
	return (q: InitialQueryBuilder) =>
		q.from({ warrior: warriors }).orderBy(({ warrior }) => warrior.name, "asc");
}

export function warriorQuery(
	{ warriors }: WarriorCollections,
	warriorId: string,
) {
	return (q: InitialQueryBuilder) =>
		q
			.from({ warrior: warriors })
			.where(({ warrior }) => eq(warrior.id, warriorId));
}

export function warriorEventReferencesQuery(
	{ events }: WarriorEventCollections,
	warriorId: string,
) {
	return (q: InitialQueryBuilder) =>
		q
			.from({ event: events })
			.where(({ event }) =>
				or(
					eq(event.attackerWarriorId, warriorId),
					eq(event.defenderWarriorId, warriorId),
				),
			);
}

export function warriorWarbandsQuery({ warbands }: WarriorWarbandCollections) {
	return (q: InitialQueryBuilder) =>
		q.from({ warband: warbands }).orderBy(({ warband }) => warband.name);
}
