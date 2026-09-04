import { type DbClient, eq, toArray, useLiveQuery } from "@tanstack/react-db";
import { getCollections } from "..";

export function useWarbands(dbClient: DbClient) {
	const { warbands, warriors } = getCollections(dbClient);

	const { data } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbands })
				.select(({ warband }) => ({
					id: warband.id,
					name: warband.name,
					faction: warband.faction,
					captain: warband.captain,
					rating: warband.rating,
					wins: warband.wins,
					status: warband.status,
					createdAt: warband.createdAt,
					updatedAt: warband.updatedAt,
					warriors: toArray(
						q
							.from({ warrior: warriors })
							.where(({ warrior }) => eq(warrior.warbandId, warband.id))
							.orderBy(({ warrior }) => warrior.name)
							.select(({ warrior }) => ({
								id: warrior.id,
								name: warrior.name,
								class: warrior.class,
								status: warrior.status,
								warbandId: warrior.warbandId,
								knocked: warrior.knocked,
								injuries: warrior.injuries,
								knockedDowns: warrior.knockedDowns,
								createdAt: warrior.createdAt,
								updatedAt: warrior.updatedAt,
							})),
					),
				}))
				.orderBy(({ warband }) => warband.name, "asc"),
	});

	return data;
}
