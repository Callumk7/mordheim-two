import { eq } from "drizzle-orm";
import type { Database } from "@/db/index.server";
import { type Clock, systemClock } from "@/db/operations/clock";
import { enqueueImageGeneration } from "@/db/operations/image-generation.server";
import {
	equipment,
	events,
	imageGenerationJobs,
	matches,
	warbands,
	warriorEquipment,
	warriors,
} from "@/db/schema";
import type { ImageGenerationMessage } from "@/db/validation/image-generation";
import {
	IMAGE_GENERATION_PROMPT_MAX_LENGTH,
	ImageGenerationInputSchema,
} from "@/db/validation/image-generation";

export function queryEventImage(db: Pick<Database, "select">, eventId: string) {
	return db
		.select({
			jobId: imageGenerationJobs.id,
			status: imageGenerationJobs.status,
			error: imageGenerationJobs.error,
		})
		.from(imageGenerationJobs)
		.where(eq(imageGenerationJobs.eventId, eventId))
		.get();
}

type WarriorContext = {
	name: string;
	class: string;
	description: string | null;
	warbandName: string;
	faction: string;
	captain: string;
	equipment: Array<{
		name: string;
		type: string;
		specialRules: string[];
	}>;
};

function clip(value: string | null, maximum: number) {
	const normalized = value?.trim() || "Unspecified";
	return normalized.length <= maximum
		? normalized
		: `${normalized.slice(0, maximum - 12)} [truncated]`;
}

function clipMiddle(value: string, maximum: number) {
	if (value.length <= maximum) return value;
	const marker = "\n[context truncated]\n";
	const available = maximum - marker.length;
	// Keep the section heading while favoring trailing fields such as scenario and
	// equipment, which would otherwise disappear first.
	const startLength = Math.floor((available * 2) / 5);
	return `${value.slice(0, startLength)}${marker}${value.slice(
		-(available - startLength),
	)}`;
}

function fitSectionsToBudget(sections: string[], budget: number) {
	let remaining = budget;
	return sections.map((section, index) => {
		const maximum = Math.floor(remaining / (sections.length - index));
		const fitted = clipMiddle(section, maximum);
		remaining -= fitted.length;
		return fitted;
	});
}

function describeWarrior(role: string, warrior: WarriorContext) {
	const equipmentList = warrior.equipment.length
		? warrior.equipment
				.map((item) => {
					const rules = item.specialRules.length
						? ` (${item.specialRules.join(", ")})`
						: "";
					return `${item.name} [${item.type}]${rules}`;
				})
				.join("; ")
		: "No recorded equipment";
	return `${role} warrior: ${clip(warrior.name, 120)}
Class: ${clip(warrior.class, 120)}
Appearance and character: ${clip(warrior.description, 600)}
Warband: ${clip(warrior.warbandName, 120)} (${clip(warrior.faction, 120)}), led by ${clip(warrior.captain, 120)}
Equipment: ${clip(equipmentList, 600)}`;
}

export function buildEventImagePrompt(context: {
	outcome: "Injury" | "Death";
	notes: string | null;
	matchName: string;
	scenario: string;
	attacker: WarriorContext;
	defender: WarriorContext;
}) {
	const opening = `Depict the decisive moment of a Mordheim combat event.
Outcome: the defending warrior suffers ${context.outcome.toLowerCase()}.`;
	const sections = [
		`Event description: ${clip(context.notes, 900)}
Match: ${clip(context.matchName, 120)}
Scenario: ${clip(context.scenario, 120)}`,
		describeWarrior("Attacking", context.attacker),
		describeWarrior("Defending", context.defender),
	];
	const direction =
		"Create a dramatic square action scene with both warriors clearly distinguishable. Show the attacker using plausible recorded equipment and the defender receiving the stated outcome. Keep the violence intense but non-graphic. Use a grim, gothic, weathered, hand-rendered Mordheim illustration with scratchy ink, muted earth tones and restrained crimson accents. No text, lettering, logos, modern objects or unrelated characters.";
	const compose = ([eventDetails, attacker, defender]: string[]) =>
		`${opening}\n${eventDetails}\n\n${attacker}\n\n${defender}\n\n${direction}`;
	let prompt = compose(sections);
	if (prompt.length > IMAGE_GENERATION_PROMPT_MAX_LENGTH) {
		const fixedLength = compose(["", "", ""]).length;
		prompt = compose(
			fitSectionsToBudget(
				sections,
				IMAGE_GENERATION_PROMPT_MAX_LENGTH - fixedLength,
			),
		);
	}
	return ImageGenerationInputSchema.parse({ prompt }).prompt;
}

async function loadWarriorContext(db: Database, warriorId: string) {
	const warrior = await db
		.select({
			name: warriors.name,
			class: warriors.class,
			description: warriors.description,
			warbandName: warbands.name,
			faction: warbands.faction,
			captain: warbands.captain,
		})
		.from(warriors)
		.innerJoin(warbands, eq(warriors.warbandId, warbands.id))
		.where(eq(warriors.id, warriorId))
		.get();
	if (!warrior) return null;
	const equipmentRows = await db
		.select({
			name: equipment.name,
			type: equipment.type,
			specialRules: equipment.specialRules,
		})
		.from(warriorEquipment)
		.innerJoin(equipment, eq(warriorEquipment.equipmentId, equipment.id))
		.where(eq(warriorEquipment.warriorId, warriorId))
		.all();
	return { ...warrior, equipment: equipmentRows };
}

export async function submitEventImage(
	db: Database,
	queue: Pick<Queue<ImageGenerationMessage>, "send">,
	eventId: string,
	clock: Clock = systemClock,
) {
	const existing = await queryEventImage(db, eventId);
	if (existing) return { job: existing } as const;

	const event = await db
		.select({
			outcome: events.outcome,
			notes: events.notes,
			voidedAt: events.voidedAt,
			attackerWarriorId: events.attackerWarriorId,
			defenderWarriorId: events.defenderWarriorId,
			matchName: matches.name,
			scenario: matches.scenario,
		})
		.from(events)
		.innerJoin(matches, eq(events.matchId, matches.id))
		.where(eq(events.id, eventId))
		.get();
	if (!event)
		return { error: "Event no longer exists. Refresh this page." } as const;
	if (
		(event.outcome !== "Injury" && event.outcome !== "Death") ||
		event.voidedAt !== null
	) {
		return { job: null } as const;
	}

	const [attacker, defender] = await Promise.all([
		loadWarriorContext(db, event.attackerWarriorId),
		loadWarriorContext(db, event.defenderWarriorId),
	]);
	if (!attacker || !defender) {
		return {
			error: "Event warrior details are no longer available.",
		} as const;
	}
	const prompt = buildEventImagePrompt({
		...event,
		outcome: event.outcome,
		attacker,
		defender,
	});
	const job = await enqueueImageGeneration(
		db,
		queue,
		prompt,
		{ eventId },
		clock,
	);
	return { job } as const;
}
