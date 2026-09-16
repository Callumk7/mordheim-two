import {
	and,
	type Collection,
	type DbClient,
	eq,
	type InitialQueryBuilder,
	toArray,
	useLiveQuery,
} from "@tanstack/react-db";
import type { Warband } from "@/db/validation/warband";
import type { Warrior } from "@/db/validation/warrior";
import { getCollections } from "..";

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

export function warbandsQuery(
	{
		warbands,
		warriors,
	}: {
		warbands: StringKeyedCollection<Warband>;
		warriors: StringKeyedCollection<Warrior>;
	},
	campaignId: string,
	showArchived = false,
) {
	return (q: InitialQueryBuilder) => {
		const source = q
			.from({ warband: warbands })
			.where(({ warband }) =>
				showArchived
					? eq(warband.campaignId, campaignId)
					: and(
							eq(warband.campaignId, campaignId),
							eq(warband.isArchived, false),
						),
			);
		return source
			.select(({ warband }) => ({
				id: warband.id,
				campaignId: warband.campaignId,
				name: warband.name,
				faction: warband.faction,
				bio: warband.bio,
				gold: warband.gold,
				rating: warband.rating,
				wins: warband.wins,
				isArchived: warband.isArchived,
				archivedAt: warband.archivedAt,
				createdAt: warband.createdAt,
				updatedAt: warband.updatedAt,
				warriors: toArray(
					q
						.from({ warrior: warriors })
						.where(({ warrior }) =>
							showArchived
								? and(
										eq(warrior.campaignId, campaignId),
										eq(warrior.warbandId, warband.id),
									)
								: and(
										eq(warrior.campaignId, campaignId),
										eq(warrior.warbandId, warband.id),
										eq(warrior.isArchived, false),
									),
						)
						.orderBy(({ warrior }) => warrior.name)
						.select(({ warrior }) => ({
							id: warrior.id,
							campaignId: warrior.campaignId,
							name: warrior.name,
							class: warrior.class,
							status: warrior.status,
							warbandId: warrior.warbandId,
							experience: warrior.experience,
							knocked: warrior.knocked,
							injuries: warrior.injuries,
							knockedDowns: warrior.knockedDowns,
							isArchived: warrior.isArchived,
							archivedAt: warrior.archivedAt,
							createdAt: warrior.createdAt,
							updatedAt: warrior.updatedAt,
						})),
				),
			}))
			.orderBy(({ warband }) => warband.name, "asc");
	};
}

export function useWarbands(
	dbClient: DbClient,
	campaignId: string,
	showArchived = false,
) {
	const collections = getCollections(dbClient);
	const { data } = useLiveQuery({
		query: warbandsQuery(collections, campaignId, showArchived),
	});
	return data;
}
