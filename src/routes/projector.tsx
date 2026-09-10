import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	Activity,
	AlertTriangle,
	Shield,
	Skull,
	Swords,
	Trophy,
	UserRound,
	Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type AppCollections, getCollections } from "@/db-collections";
import type { ProjectorWarrior } from "@/lib/projector";
import {
	type BreakingAlert,
	findBreakingAlerts,
	getCurrentAlertKeys,
	type ProjectorData,
	type ProjectorHighlight,
	type ProjectorInput,
	type ProjectorMatch,
	parseRotationSeconds,
	projectProjectorData,
} from "@/lib/projector";
import { getWarriorPortrait } from "@/server/warrior-portraits";

const POLL_INTERVAL_MS = 5_000;
const ALERT_DURATION_MS = 7_000;
const SEGMENTS = [
	"Standings",
	"Warrior spotlight",
	"Match center",
	"Highlights",
] as const;

export const Route = createFileRoute("/projector")({
	ssr: false,
	validateSearch: (search) => ({
		rotation: parseRotationSeconds(search.rotation),
	}),
	loader: async ({ context }) => {
		const { events, matches, warbandMatches, warbands, warriors } =
			getCollections(context.dbClient);
		await Promise.all([
			events.preload(),
			matches.preload(),
			warbandMatches.preload(),
			warbands.preload(),
			warriors.preload(),
		]);
		return null;
	},
	component: ProjectorPage,
});

function ProjectorPage() {
	const { dbClient } = Route.useRouteContext();
	const { rotation } = Route.useSearch();
	const collections = useMemo(() => getCollections(dbClient), [dbClient]);
	const initialInput = useMemo(
		() => readCollections(collections),
		[collections],
	);
	const [data, setData] = useState(() => projectProjectorData(initialInput));
	const [isStale, setIsStale] = useState(false);
	const [segmentIndex, setSegmentIndex] = useState(0);
	const [rotationCount, setRotationCount] = useState(0);
	const [alerts, setAlerts] = useState<BreakingAlert[]>([]);
	const seenAlerts = useRef(getCurrentAlertKeys(initialInput));
	const activeAlert = alerts[0] ?? null;

	useEffect(() => {
		let stopped = false;
		let polling = false;
		const poll = async () => {
			if (polling) return;
			polling = true;
			try {
				const results = await Promise.allSettled([
					collections.events.utils.refetch({ throwOnError: true }),
					collections.matches.utils.refetch({ throwOnError: true }),
					collections.warbandMatches.utils.refetch({ throwOnError: true }),
					collections.warbands.utils.refetch({ throwOnError: true }),
					collections.warriors.utils.refetch({ throwOnError: true }),
				]);
				if (results.some((result) => result.status === "rejected")) {
					throw new Error("Projector collection poll failed.");
				}
				if (stopped) return;
				const nextInput = readCollections(collections);
				const breaking = findBreakingAlerts(nextInput, seenAlerts.current);
				seenAlerts.current = breaking.seen;
				setData(projectProjectorData(nextInput));
				setIsStale(false);
				if (breaking.alerts.length > 0) {
					setAlerts((current) => [...current, ...breaking.alerts]);
				}
			} catch {
				if (!stopped) setIsStale(true);
			} finally {
				polling = false;
			}
		};
		const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
		return () => {
			stopped = true;
			window.clearInterval(interval);
		};
	}, [collections]);

	useEffect(() => {
		if (activeAlert) return;
		const interval = window.setInterval(() => {
			setSegmentIndex((current) => (current + 1) % SEGMENTS.length);
			setRotationCount((current) => current + 1);
		}, rotation * 1_000);
		return () => window.clearInterval(interval);
	}, [activeAlert, rotation]);

	useEffect(() => {
		if (!activeAlert) return;
		const timeout = window.setTimeout(
			() => setAlerts((current) => current.slice(1)),
			ALERT_DURATION_MS,
		);
		return () => window.clearTimeout(timeout);
	}, [activeAlert]);

	return (
		<main className="fixed inset-0 flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-muted),transparent_42%)] opacity-50" />
			<header className="relative flex shrink-0 items-center justify-between border-b border-border px-[clamp(1rem,3vw,3rem)] py-4">
				<div>
					<p className="font-mordheim text-[clamp(1.7rem,3vw,3.2rem)] leading-none tracking-wide">
						Warband News Network
					</p>
					<p className="mt-1 text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
						Live campaign ledger
					</p>
				</div>
				<div className="flex items-center gap-3">
					{isStale ? (
						<span
							aria-live="polite"
							className="flex items-center gap-2 rounded-full border border-destructive/60 bg-destructive/10 px-4 py-2 text-sm font-bold uppercase tracking-widest text-destructive"
						>
							<AlertTriangle className="size-4" /> Data stale
						</span>
					) : (
						<span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
							<span className="size-2 rounded-full bg-primary" /> Polling every
							5s
						</span>
					)}
				</div>
			</header>

			<section
				aria-live={activeAlert ? "assertive" : "off"}
				className="relative min-h-0 flex-1 px-[clamp(1rem,3vw,3rem)] py-[clamp(1rem,2.5vh,2rem)]"
			>
				{activeAlert ? (
					<BreakingNews alert={activeAlert} />
				) : (
					<Segment
						data={data}
						index={segmentIndex}
						spotlightIndex={Math.floor(rotationCount / SEGMENTS.length)}
					/>
				)}
			</section>

			<footer className="relative shrink-0 border-t border-border bg-card/95">
				<div className="flex items-stretch overflow-hidden">
					<div className="z-10 flex shrink-0 items-center bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.24em] text-primary-foreground">
						WNN ticker
					</div>
					<div className="projector-ticker min-w-0 flex-1 overflow-hidden py-3 text-[clamp(0.9rem,1.3vw,1.2rem)] font-semibold">
						<div className="projector-ticker-track flex w-max gap-12 whitespace-nowrap px-8">
							<div className="flex gap-12">
								{data.ticker.map((item) => (
									<span key={item}>
										{item} <span className="ml-12 text-primary">◆</span>
									</span>
								))}
							</div>
							<div aria-hidden="true" className="flex gap-12">
								{data.ticker.map((item) => (
									<span key={item}>
										{item} <span className="ml-12 text-primary">◆</span>
									</span>
								))}
							</div>
						</div>
					</div>
				</div>
			</footer>
		</main>
	);
}

function Segment({
	data,
	index,
	spotlightIndex,
}: {
	data: ProjectorData;
	index: number;
	spotlightIndex: number;
}) {
	switch (index) {
		case 0:
			return <Standings data={data} />;
		case 1:
			return <WarriorSpotlight data={data} index={spotlightIndex} />;
		case 2:
			return <MatchCenter data={data} />;
		default:
			return <Highlights highlights={data.highlights} />;
	}
}

function SegmentHeading({
	eyebrow,
	title,
}: {
	eyebrow: string;
	title: string;
}) {
	return (
		<header className="mb-[clamp(1rem,2vh,2rem)] flex items-end justify-between gap-6">
			<div>
				<p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
					{eyebrow}
				</p>
				<h1 className="mt-1 font-mordheim text-[clamp(2.5rem,6vw,6rem)] leading-none">
					{title}
				</h1>
			</div>
			<Swords
				className="hidden size-16 text-muted-foreground/30 sm:block"
				strokeWidth={1}
			/>
		</header>
	);
}

function Standings({ data }: { data: ProjectorData }) {
	return (
		<div className="flex h-full flex-col">
			<SegmentHeading eyebrow="Campaign table" title="Warband standings" />
			{data.standings.length === 0 ? (
				<EmptyState message="No warbands have entered the campaign." />
			) : (
				<div className="min-h-0 overflow-hidden rounded-xl border border-border bg-card/80">
					<div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_0.7fr_0.7fr_1fr] gap-4 border-b border-border bg-muted/50 px-6 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
						<span>Warband</span>
						<span>Faction</span>
						<span className="text-right">Rating</span>
						<span className="text-right">Wins</span>
						<span className="text-right">Status</span>
					</div>
					{data.standings.slice(0, 8).map((warband, index) => (
						<div
							className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_0.7fr_0.7fr_1fr] items-center gap-4 border-b border-border/60 px-6 py-[clamp(0.55rem,1.3vh,1rem)] last:border-0"
							key={warband.id}
						>
							<div className="flex min-w-0 items-baseline gap-4">
								<span className="font-mono text-xl text-muted-foreground">
									{index + 1}
								</span>
								<strong className="truncate font-serif text-[clamp(1.2rem,2.2vw,2.1rem)]">
									{warband.name}
								</strong>
							</div>
							<span className="truncate text-[clamp(0.9rem,1.3vw,1.2rem)] text-muted-foreground">
								{warband.faction}
							</span>
							<strong className="text-right font-mono text-[clamp(1.2rem,2vw,2rem)]">
								{warband.rating}
							</strong>
							<strong className="text-right font-mono text-[clamp(1.2rem,2vw,2rem)]">
								{warband.wins}
							</strong>
							<span className="text-right text-sm font-bold uppercase tracking-wide text-primary">
								{warband.status}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function WarriorSpotlight({
	data,
	index,
}: {
	data: ProjectorData;
	index: number;
}) {
	const warrior =
		data.warriors.length > 0
			? data.warriors[index % data.warriors.length]
			: undefined;
	return (
		<div className="flex h-full flex-col">
			<SegmentHeading
				eyebrow="Faces of the campaign"
				title="Warrior spotlight"
			/>
			{warrior ? (
				<div className="grid min-h-0 flex-1 gap-[clamp(1rem,4vw,4rem)] md:grid-cols-[minmax(16rem,0.8fr)_1.3fr]">
					<Portrait warriorId={warrior.id} name={warrior.name} />
					<div className="flex min-h-0 flex-col justify-center">
						<p className="text-sm font-bold uppercase tracking-[0.28em] text-primary">
							{warrior.class} · {warrior.warbandName}
						</p>
						<h2 className="mt-2 font-mordheim text-[clamp(3rem,8vw,8rem)] leading-[0.9]">
							{warrior.name}
						</h2>
						<p className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-bold uppercase tracking-widest">
							<Shield className="size-4" /> {warrior.effectiveStatus}
						</p>
						<CombatStats warrior={warrior} />
					</div>
				</div>
			) : (
				<EmptyState message="No warriors are available for the spotlight." />
			)}
		</div>
	);
}

function CombatStats({ warrior }: { warrior: ProjectorWarrior }) {
	const stats = [
		["Knockdowns given", warrior.combat.knockdownsGiven],
		["Knockdowns taken", warrior.combat.knockdownsTaken],
		["Injuries given", warrior.combat.injuriesGiven],
		["Injuries taken", warrior.combat.injuriesTaken],
		["Deaths given", warrior.combat.deathsGiven],
	] as const;
	return (
		<dl className="mt-[clamp(1rem,4vh,3rem)] grid grid-cols-2 gap-3 xl:grid-cols-5">
			{stats.map(([label, value]) => (
				<div
					className="rounded-xl border border-border bg-card/80 p-[clamp(0.7rem,1.4vw,1.3rem)]"
					key={label}
				>
					<dt className="text-xs uppercase tracking-wide text-muted-foreground">
						{label}
					</dt>
					<dd className="mt-1 font-mono text-[clamp(1.7rem,3vw,3rem)] font-bold">
						{value}
					</dd>
				</div>
			))}
		</dl>
	);
}

function MatchCenter({ data }: { data: ProjectorData }) {
	const groups = [
		["Live", data.matches.live, <Activity className="size-5" key="live" />],
		[
			"Scheduled",
			data.matches.scheduled,
			<Swords className="size-5" key="scheduled" />,
		],
		["Recent", data.matches.recent, <Trophy className="size-5" key="recent" />],
	] as const;
	return (
		<div className="flex h-full flex-col">
			<SegmentHeading eyebrow="Fixtures and results" title="Match center" />
			<div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
				{groups.map(([title, matches, icon]) => (
					<section
						className="min-h-0 overflow-hidden rounded-xl border border-border bg-card/80 p-5"
						key={title}
					>
						<h2 className="flex items-center gap-2 border-b border-border pb-3 font-serif text-[clamp(1.4rem,2.3vw,2.2rem)]">
							{icon}
							{title}
						</h2>
						<div className="mt-3 space-y-3">
							{matches.length === 0 ? (
								<p className="py-8 text-center text-muted-foreground">
									No {title.toLowerCase()} matches.
								</p>
							) : (
								matches
									.slice(0, 4)
									.map((match) => <MatchCard key={match.id} match={match} />)
							)}
						</div>
					</section>
				))}
			</div>
		</div>
	);
}

function MatchCard({ match }: { match: ProjectorMatch }) {
	const result =
		match.result === "Victory"
			? `${match.winnerName ?? "Unknown warband"} won`
			: match.result;
	return (
		<article className="rounded-lg border border-border/70 bg-background/60 p-4">
			<div className="flex items-start justify-between gap-3">
				<h3 className="font-serif text-[clamp(1.15rem,1.7vw,1.6rem)] font-bold">
					{match.name}
				</h3>
				<span className="text-xs font-bold uppercase tracking-wide text-primary">
					{match.status === "InProgress" ? "In progress" : match.status}
				</span>
			</div>
			<p className="mt-2 font-semibold">
				{match.participantNames.join(" vs ") || "Participants pending"}
			</p>
			<p className="mt-1 text-sm text-muted-foreground">
				Scenario: {match.scenario}
			</p>
			<p className="mt-2 text-sm font-bold uppercase tracking-wide">
				Result: {result}
			</p>
		</article>
	);
}

function Highlights({ highlights }: { highlights: ProjectorHighlight[] }) {
	return (
		<div className="flex h-full flex-col">
			<SegmentHeading eyebrow="From the streets" title="Latest highlights" />
			{highlights.length === 0 ? (
				<EmptyState message="No active combat events have been recorded." />
			) : (
				<div className="grid min-h-0 flex-1 auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{highlights.map((highlight) => (
						<HighlightCard highlight={highlight} key={highlight.id} />
					))}
				</div>
			)}
		</div>
	);
}

function HighlightCard({ highlight }: { highlight: ProjectorHighlight }) {
	return (
		<article className="grid min-h-0 grid-cols-[5rem_1fr] gap-4 overflow-hidden rounded-xl border border-border bg-card/80 p-4">
			<Portrait
				compact
				warriorId={highlight.defenderId}
				name={highlight.defenderName}
			/>
			<div className="min-w-0 self-center">
				<p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
					{highlight.phase === "Death" ? (
						<Skull className="size-4" />
					) : (
						<Zap className="size-4" />
					)}
					{highlight.phase}
				</p>
				<h2 className="mt-2 font-serif text-[clamp(1.1rem,1.8vw,1.7rem)] font-bold leading-tight">
					{highlight.attackerName} → {highlight.defenderName}
				</h2>
				<p className="mt-2 truncate text-sm text-muted-foreground">
					{highlight.matchName}
				</p>
			</div>
		</article>
	);
}

function BreakingNews({ alert }: { alert: BreakingAlert }) {
	return (
		<div className="flex h-full items-center justify-center">
			<article className="grid w-full max-w-6xl gap-[clamp(1.5rem,5vw,5rem)] rounded-2xl border-2 border-destructive bg-card p-[clamp(1.5rem,4vw,4rem)] shadow-2xl md:grid-cols-[minmax(14rem,0.7fr)_1.3fr]">
				<Portrait warriorId={alert.defenderId} name={alert.defenderName} />
				<div className="self-center">
					<p className="flex items-center gap-3 text-[clamp(1rem,2vw,1.5rem)] font-black uppercase tracking-[0.3em] text-destructive">
						<AlertTriangle className="size-7" /> Breaking alert
					</p>
					<h1 className="mt-4 font-mordheim text-[clamp(3.5rem,9vw,9rem)] leading-[0.85]">
						{alert.phase}
					</h1>
					<p className="mt-6 font-serif text-[clamp(1.5rem,3.4vw,3.4rem)] font-bold leading-tight">
						{alert.attackerName} → {alert.defenderName}
					</p>
					<p className="mt-4 text-[clamp(1rem,1.7vw,1.5rem)] text-muted-foreground">
						{alert.matchName}
					</p>
				</div>
			</article>
		</div>
	);
}

function Portrait({
	warriorId,
	name,
	compact = false,
}: {
	warriorId: string;
	name: string;
	compact?: boolean;
}) {
	const loadPortrait = useServerFn(getWarriorPortrait);
	const [portrait, setPortrait] = useState<Awaited<
		ReturnType<typeof getWarriorPortrait>
	> | null>(null);
	const [imageFailed, setImageFailed] = useState(false);
	useEffect(() => {
		let active = true;
		setPortrait(null);
		setImageFailed(false);
		void loadPortrait({ data: { warriorId } })
			.then((result) => {
				if (active) setPortrait(result);
			})
			.catch(() => {
				if (active) {
					setPortrait({
						error:
							"Could not load portrait status. Refresh this page to try again.",
					});
				}
			});
		return () => {
			active = false;
		};
	}, [loadPortrait, warriorId]);
	const job = portrait?.job;
	const className = compact
		? "aspect-square size-20 rounded-lg"
		: "aspect-square h-full max-h-[48vh] w-full rounded-2xl";
	if (job?.status === "completed" && !imageFailed) {
		return (
			<img
				alt={`Portrait of ${name}`}
				className={`${className} object-cover bg-muted`}
				onError={() => setImageFailed(true)}
				src={`/api/generated-images/${encodeURIComponent(job.jobId)}`}
			/>
		);
	}
	return (
		<div
			className={`${className} flex flex-col items-center justify-center border border-border bg-muted/50 text-center text-muted-foreground`}
		>
			<UserRound
				className={compact ? "size-8" : "size-[clamp(4rem,10vw,9rem)]"}
				strokeWidth={1}
			/>
			{!compact && (
				<p className="mt-4 px-4 text-sm font-semibold uppercase tracking-widest">
					{portrait === null
						? "Portrait loading"
						: portrait.job &&
								["pending", "queued", "processing"].includes(
									portrait.job.status,
								)
							? "Portrait pending"
							: "Portrait unavailable"}
				</p>
			)}
		</div>
	);
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10 text-center font-serif text-[clamp(1.5rem,3vw,3rem)] text-muted-foreground">
			{message}
		</div>
	);
}

function readCollections(collections: AppCollections): ProjectorInput {
	return {
		events: collections.events.toArray,
		matches: collections.matches.toArray,
		participants: collections.warbandMatches.toArray,
		warbands: collections.warbands.toArray,
		warriors: collections.warriors.toArray,
	};
}
