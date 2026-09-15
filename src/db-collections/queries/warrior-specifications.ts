import {
	and,
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
	warbands: StringKeyedCollection<Warband>;
	warriors: StringKeyedCollection<Warrior>;
};

type WarriorEventCollections = {
	events: StringKeyedCollection<Event>;
};

type WarriorWarbandCollections = {
	warbands: StringKeyedCollection<Warband>;
};

export function warriorsQuery(
	{ warbands, warriors }: WarriorCollections,
	campaignId: string,
	showArchived = false,
) {
	return (q: InitialQueryBuilder) => {
		const query = q
			.from({ warrior: warriors })
			.innerJoin({ warband: warbands }, ({ warrior, warband }) =>
				eq(warrior.warbandId, warband.id),
			)
			.where(({ warrior, warband }) =>
				showArchived
					? and(
							eq(warrior.campaignId, campaignId),
							eq(warband.campaignId, campaignId),
						)
					: and(
							eq(warrior.campaignId, campaignId),
							eq(warband.campaignId, campaignId),
							eq(warrior.isArchived, false),
							eq(warband.isArchived, false),
						),
			);
		return query
			.select(({ warrior }) => ({
				id: warrior.id,
				campaignId: warrior.campaignId,
				name: warrior.name,
				class: warrior.class,
				description: warrior.description,
				status: warrior.status,
				warbandId: warrior.warbandId,
				knocked: warrior.knocked,
				injuries: warrior.injuries,
				knockedDowns: warrior.knockedDowns,
				isArchived: warrior.isArchived,
				archivedAt: warrior.archivedAt,
				createdAt: warrior.createdAt,
				updatedAt: warrior.updatedAt,
			}))
			.orderBy(({ warrior }) => warrior.name, "asc");
	};
}

export function warriorQuery(
	{ warriors }: Pick<WarriorCollections, "warriors">,
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

export function warriorWarbandsQuery(
	{ warbands }: WarriorWarbandCollections,
	campaignId: string,
	showArchived = false,
) {
	return (q: InitialQueryBuilder) =>
		q
			.from({ warband: warbands })
			.where(({ warband }) =>
				showArchived
					? eq(warband.campaignId, campaignId)
					: and(
							eq(warband.campaignId, campaignId),
							eq(warband.isArchived, false),
						),
			)
			.orderBy(({ warband }) => warband.name);
}
