import { ilike, safeRandomUUID, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	createColumnHelper,
	createSortedRowModel,
	rowSortingFeature,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { type Warband, warbandsCollection } from "../db-collections/warbands";

export const Route = createFileRoute("/demo")({
	ssr: false,
	loader: async () => {
		await warbandsCollection.preload();
		return null;
	},
	component: DemoPage,
});

const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, Warband>();

const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		header: "Warband",
		cell: ({ row }) => (
			<div className="grid min-w-44 gap-1">
				<EditableText
					ariaLabel="Warband name"
					className="font-semibold text-stone-100"
					onCommit={(name) =>
						warbandsCollection.update(row.original.id, (draft) => {
							draft.name = name;
						})
					}
					value={row.original.name}
				/>
				<EditableText
					ariaLabel="Faction"
					className="text-xs text-stone-500"
					onCommit={(faction) =>
						warbandsCollection.update(row.original.id, (draft) => {
							draft.faction = faction;
						})
					}
					value={row.original.faction}
				/>
			</div>
		),
	}),
	columnHelper.accessor("captain", {
		header: "Captain",
		cell: ({ row }) => (
			<EditableText
				ariaLabel="Captain"
				onCommit={(captain) =>
					warbandsCollection.update(row.original.id, (draft) => {
						draft.captain = captain;
					})
				}
				value={row.original.captain}
			/>
		),
	}),
	columnHelper.accessor("rating", {
		header: "Rating",
		cell: ({ row }) => (
			<EditableNumber
				ariaLabel="Rating"
				onCommit={(rating) =>
					warbandsCollection.update(row.original.id, (draft) => {
						draft.rating = rating;
					})
				}
				value={row.original.rating}
			/>
		),
	}),
	columnHelper.accessor("wins", {
		header: "Wins",
		cell: ({ row }) => (
			<EditableNumber
				ariaLabel="Wins"
				onCommit={(wins) =>
					warbandsCollection.update(row.original.id, (draft) => {
						draft.wins = wins;
					})
				}
				value={row.original.wins}
			/>
		),
	}),
	columnHelper.accessor("status", {
		header: "Status",
		cell: ({ row }) => (
			<select
				aria-label="Status"
				className="rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-stone-300 outline-none transition hover:border-stone-700 focus:border-amber-500"
				onChange={(event) =>
					warbandsCollection.update(row.original.id, (draft) => {
						draft.status = event.target.value as Warband["status"];
					})
				}
				value={row.original.status}
			>
				<option value="Ready">Ready</option>
				<option value="Recovering">Recovering</option>
				<option value="Recruiting">Recruiting</option>
			</select>
		),
	}),
	columnHelper.display({
		id: "actions",
		header: "Actions",
		cell: ({ row }) => (
			<div className="flex justify-end gap-2">
				<button
					className="rounded-md border border-stone-700 px-2.5 py-1 text-xs text-stone-300 transition hover:border-amber-400/60 hover:text-amber-300"
					onClick={() => {
						warbandsCollection.update(row.original.id, (draft) => {
							draft.wins += 1;
							draft.rating += 5;
						});
					}}
					type="button"
				>
					+ win
				</button>
				<button
					aria-label={`Delete ${row.original.name}`}
					className="rounded-md border border-stone-700 px-2.5 py-1 text-xs text-stone-500 transition hover:border-rose-400/60 hover:text-rose-300"
					onClick={() => warbandsCollection.delete(row.original.id)}
					type="button"
				>
					Remove
				</button>
			</div>
		),
	}),
]);

function DemoPage() {
	const [search, setSearch] = useState("");
	const [name, setName] = useState("");

	const { data: warbands, isLoading } = useLiveQuery({
		query: (q) => {
			const query = q.from({ warband: warbandsCollection });
			return search.trim()
				? query.where(({ warband }) =>
						ilike(warband.name, `%${search.trim()}%`),
					)
				: query;
		},
	});

	const table = useTable({
		features,
		columns,
		data: warbands,
		getRowId: (row) => row.id,
	});

	const totalRating = warbands.reduce(
		(sum, warband) => sum + warband.rating,
		0,
	);

	return (
		<main className="min-h-screen bg-[#0c0b09] px-4 py-10 text-stone-300 sm:px-8">
			<div className="mx-auto max-w-6xl">
				<Link
					className="text-sm text-stone-500 transition hover:text-amber-300"
					to="/"
				>
					← Home
				</Link>

				<header className="mt-8 border-b border-stone-800 pb-8">
					<p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-amber-400">
						Interactive integration
					</p>
					<div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
						<div>
							<h1 className="font-serif text-4xl font-semibold tracking-tight text-stone-100 sm:text-6xl">
								Warband Registry
							</h1>
							<p className="mt-3 max-w-2xl text-stone-400">
								TanStack DB owns the reactive records. TanStack Table turns the
								live query into a sortable, headless data grid.
							</p>
						</div>
						<div className="flex gap-6 text-sm">
							<Metric label="Warbands" value={warbands.length} />
							<Metric label="Total rating" value={totalRating} />
						</div>
					</div>
				</header>

				<section className="my-6 grid gap-3 rounded-xl border border-stone-800 bg-stone-900/40 p-4 md:grid-cols-[1fr_auto]">
					<label className="grid gap-1.5 text-xs font-medium uppercase tracking-wider text-stone-500">
						Live DB query
						<input
							className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm normal-case tracking-normal text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-500"
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Filter warbands by name…"
							value={search}
						/>
					</label>
					<form
						className="flex items-end gap-2"
						onSubmit={(event) => {
							event.preventDefault();
							const trimmedName = name.trim();
							if (!trimmedName) return;

							warbandsCollection.insert({
								id: safeRandomUUID(),
								name: trimmedName,
								faction: "Mercenaries",
								captain: "New Captain",
								rating: 100,
								wins: 0,
								status: "Recruiting",
							});
							setName("");
						}}
					>
						<label className="grid min-w-52 flex-1 gap-1.5 text-xs font-medium uppercase tracking-wider text-stone-500">
							Optimistic insert
							<input
								className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm normal-case tracking-normal text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-500"
								onChange={(event) => setName(event.target.value)}
								placeholder="New warband name"
								value={name}
							/>
						</label>
						<button
							className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
							disabled={!name.trim()}
							type="submit"
						>
							Add
						</button>
					</form>
				</section>

				<div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-950/60 shadow-2xl shadow-black/20">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[760px] border-collapse text-left text-sm">
							<thead className="border-b border-stone-800 bg-stone-900/70 text-xs uppercase tracking-wider text-stone-500">
								{table.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id}>
										{headerGroup.headers.map((header) => {
											const sortDirection = header.column.getIsSorted();

											return (
												<th className="px-5 py-3.5 font-medium" key={header.id}>
													{header.isPlaceholder ? null : (
														<button
															className="inline-flex items-center gap-1.5 disabled:cursor-default"
															disabled={!header.column.getCanSort()}
															onClick={header.column.getToggleSortingHandler()}
															type="button"
														>
															<table.FlexRender header={header} />
															{sortDirection === "asc"
																? "↑"
																: sortDirection === "desc"
																	? "↓"
																	: null}
														</button>
													)}
												</th>
											);
										})}
									</tr>
								))}
							</thead>
							<tbody className="divide-y divide-stone-800/80">
								{table.getRowModel().rows.map((row) => (
									<tr className="transition hover:bg-stone-900/60" key={row.id}>
										{row.getAllCells().map((cell) => (
											<td className="px-5 py-4" key={cell.id}>
												<table.FlexRender cell={cell} />
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{!isLoading && table.getRowModel().rows.length === 0 ? (
						<div className="border-t border-stone-800 px-5 py-12 text-center text-sm text-stone-500">
							No warbands match “{search}”.
						</div>
					) : null}
				</div>

				<p className="mt-4 text-xs text-stone-600">
					Tip: click any value to edit it, or click a column heading to sort.
					Edits commit on blur or Enter and flow through the DB live query.
				</p>
			</div>
		</main>
	);
}

const editableCellClass =
	"w-full rounded-md border border-transparent bg-transparent px-2 py-1 outline-none transition hover:border-stone-700 focus:border-amber-500 focus:bg-stone-950";

function EditableText({
	ariaLabel,
	className = "",
	onCommit,
	value,
}: {
	ariaLabel: string;
	className?: string;
	onCommit: (value: string) => void;
	value: string;
}) {
	const [draftValue, setDraftValue] = useState(value);

	useEffect(() => setDraftValue(value), [value]);

	const commit = () => {
		const nextValue = draftValue.trim();
		if (!nextValue) {
			setDraftValue(value);
			return;
		}
		if (nextValue !== value) onCommit(nextValue);
	};

	return (
		<input
			aria-label={ariaLabel}
			className={`${editableCellClass} ${className}`}
			onBlur={commit}
			onChange={(event) => setDraftValue(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === "Enter") event.currentTarget.blur();
				if (event.key === "Escape") setDraftValue(value);
			}}
			value={draftValue}
		/>
	);
}

function EditableNumber({
	ariaLabel,
	onCommit,
	value,
}: {
	ariaLabel: string;
	onCommit: (value: number) => void;
	value: number;
}) {
	const [draftValue, setDraftValue] = useState(String(value));

	useEffect(() => setDraftValue(String(value)), [value]);

	const commit = () => {
		const nextValue = Math.max(0, Math.round(Number(draftValue)));
		if (!Number.isFinite(nextValue)) {
			setDraftValue(String(value));
			return;
		}
		setDraftValue(String(nextValue));
		if (nextValue !== value) onCommit(nextValue);
	};

	return (
		<input
			aria-label={ariaLabel}
			className={`${editableCellClass} w-20 font-mono text-amber-300`}
			min="0"
			onBlur={commit}
			onChange={(event) => setDraftValue(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === "Enter") event.currentTarget.blur();
				if (event.key === "Escape") setDraftValue(String(value));
			}}
			type="number"
			value={draftValue}
		/>
	);
}

function Metric({ label, value }: { label: string; value: number }) {
	return (
		<div>
			<div className="font-mono text-2xl text-stone-100">{value}</div>
			<div className="text-xs uppercase tracking-wider text-stone-600">
				{label}
			</div>
		</div>
	);
}
