import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	IndexEmptyState,
	IndexPage,
	IndexPageHeader,
} from "@/components/index-page";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getCollections } from "@/db-collections";

export const Route = createFileRoute("/equipment")({
	ssr: false,
	loader: async ({ context }) => {
		await getCollections(context.dbClient).equipment.preload();
	},
	pendingComponent: () => (
		<main className="p-8">
			<output>Loading equipment…</output>
		</main>
	),
	errorComponent: () => (
		<main className="p-8" role="alert">
			<h1 className="font-mordheim text-3xl">Unable to load equipment</h1>
			<p className="mt-2 text-muted-foreground">
				Check the database connection and migrations, then reload this page.
			</p>
		</main>
	),
	component: EquipmentPage,
});

function EquipmentPage() {
	const { dbClient } = Route.useRouteContext();
	const { equipment } = getCollections(dbClient);
	const { data, isLoading, isError } = useLiveQuery({
		query: (q) =>
			q.from({ item: equipment }).orderBy(({ item }) => item.name, "asc"),
	});
	const [search, setSearch] = useState("");
	const [type, setType] = useState<"all" | "weapon" | "armour">("all");
	const [refreshing, setRefreshing] = useState(false);
	const [refreshError, setRefreshError] = useState(false);
	const needle = search.trim().toLowerCase();
	const visible = data.filter(
		(item) =>
			(type === "all" || item.type === type) &&
			[item.name, item.availability, ...item.specialRules].some((value) =>
				value?.toLowerCase().includes(needle),
			),
	);

	async function refresh() {
		setRefreshing(true);
		setRefreshError(false);
		try {
			await equipment.utils.refetch({ throwOnError: true });
		} catch {
			setRefreshError(true);
		} finally {
			setRefreshing(false);
		}
	}

	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
			<IndexPage>
				<IndexPageHeader
					title="Equipment"
					description="Read-only database catalogue for validating imports. Expand an item to inspect its rules and source."
					action={
						<Button variant="outline" isDisabled={refreshing} onPress={refresh}>
							{refreshing ? "Refreshing…" : "Refresh from database"}
						</Button>
					}
				/>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
					<Field className="sm:max-w-md">
						<FieldLabel htmlFor="equipment-search">Search equipment</FieldLabel>
						<Input
							id="equipment-search"
							type="search"
							placeholder="Name, availability or special rule"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</Field>
					<fieldset aria-label="Equipment type" className="flex gap-2">
						{(["all", "weapon", "armour"] as const).map((value) => (
							<Button
								key={value}
								variant={type === value ? "default" : "outline"}
								aria-pressed={type === value}
								onPress={() => setType(value)}
							>
								{value === "all"
									? "All"
									: value === "weapon"
										? "Weapons"
										: "Armour"}
							</Button>
						))}
					</fieldset>
				</div>
				{(isError || refreshError) && (
					<p role="alert" className="text-destructive">
						Could not load the latest equipment. Displayed records may be stale.
						Try refreshing again.
					</p>
				)}
				{isLoading ? (
					<output>Loading equipment…</output>
				) : (
					<>
						<output className="text-sm text-muted-foreground">
							Showing {visible.length} of {data.length} records. “—” means not
							stated or not applicable; unknown prices are not free.
						</output>
						{visible.length === 0 ? (
							<IndexEmptyState
								title={
									data.length
										? "No matching equipment"
										: "No equipment in this database"
								}
								description={
									data.length
										? "Try a different search or type filter."
										: "Run the equipment import for this environment, then refresh."
								}
								action={null}
							/>
						) : (
							<div className="grid gap-3">
								{visible.map((item) => (
									<details
										key={item.id}
										className="rounded-xl border border-border bg-card text-card-foreground"
									>
										<summary className="cursor-pointer rounded-xl px-5 py-4 focus-visible:outline-2 focus-visible:outline-ring">
											<span className="font-semibold">{item.name}</span>
											<span className="ml-3 text-sm text-muted-foreground">
												{item.type} · {item.cost ?? "Cost not stated"}
											</span>
										</summary>
										<div className="grid gap-5 border-t border-border p-5 text-sm">
											<dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
												{[
													["Availability", item.availability],
													["Range", item.range],
													["Strength", item.strength],
													["Save", item.save],
												].map(([label, value]) => (
													<div key={label}>
														<dt className="text-muted-foreground">{label}</dt>
														<dd className="mt-1">{value ?? "—"}</dd>
													</div>
												))}
											</dl>
											<p>
												<span className="font-semibold">Special rules: </span>
												{item.specialRules.join(", ") || "None listed"}
											</p>
											{item.notes && (
												<p className="whitespace-pre-wrap">
													<span className="font-semibold">Notes: </span>
													{item.notes}
												</p>
											)}
											{item.sourceUrl &&
												/^https?:\/\//i.test(item.sourceUrl) && (
													<a
														href={item.sourceUrl}
														target="_blank"
														rel="noreferrer"
														className="text-primary underline"
													>
														View original source ↗
													</a>
												)}
											{item.sourceText && (
												<div>
													<h2 className="mb-2 font-semibold">
														Full source text
													</h2>
													<p className="whitespace-pre-wrap break-words leading-relaxed">
														{item.sourceText}
													</p>
												</div>
											)}
											<p className="break-all font-mono text-xs text-muted-foreground">
												ID: {item.id}
											</p>
										</div>
									</details>
								))}
							</div>
						)}
					</>
				)}
			</IndexPage>
		</main>
	);
}
