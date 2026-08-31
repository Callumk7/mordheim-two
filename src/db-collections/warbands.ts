import {
	createCollection,
	localOnlyCollectionOptions,
} from "@tanstack/react-db";
import { z } from "zod";

export const WarbandSchema = z.object({
	id: z.string(),
	name: z.string(),
	faction: z.string(),
	captain: z.string(),
	rating: z.number().int().nonnegative(),
	wins: z.number().int().nonnegative(),
	status: z.enum(["Ready", "Recovering", "Recruiting"]),
});

export type Warband = z.infer<typeof WarbandSchema>;

const initialWarbands: Array<Warband> = [
	{
		id: "reikland-reavers",
		name: "Reikland Reavers",
		faction: "Mercenaries",
		captain: "Otto Falk",
		rating: 186,
		wins: 7,
		status: "Ready",
	},
	{
		id: "sisters-of-sigmar",
		name: "The Silver Hammers",
		faction: "Sisters of Sigmar",
		captain: "Bertha Bestraufrung",
		rating: 221,
		wins: 10,
		status: "Ready",
	},
	{
		id: "night-runners",
		name: "Night Runners",
		faction: "Skaven",
		captain: "Skritch",
		rating: 154,
		wins: 5,
		status: "Recruiting",
	},
	{
		id: "the-unquiet",
		name: "The Unquiet",
		faction: "Undead",
		captain: "Count Vashenko",
		rating: 208,
		wins: 8,
		status: "Recovering",
	},
	{
		id: "witch-hunters",
		name: "Ash and Iron",
		faction: "Witch Hunters",
		captain: "Gregor Stahl",
		rating: 173,
		wins: 6,
		status: "Ready",
	},
	{
		id: "possessed",
		name: "Children of the Pit",
		faction: "The Possessed",
		captain: "Marius the Changed",
		rating: 197,
		wins: 7,
		status: "Recovering",
	},
];

export const warbandsCollection = createCollection(
	localOnlyCollectionOptions({
		id: "warbands-demo",
		getKey: (warband) => warband.id,
		schema: WarbandSchema,
		initialData: initialWarbands,
	}),
);
