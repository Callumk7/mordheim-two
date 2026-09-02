import { safeRandomUUID, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "../components/ui/card";
import {
	WarriorForm,
	type WarriorFormValues,
} from "../components/warrior-form";
import { getWarbandsCollection } from "../db-collections/warbands";
import { getWarriorsCollection } from "../db-collections/warriors";

export const Route = createFileRoute("/warriors/new")({
	component: NewWarriorPage,
});

function NewWarriorPage() {
	const { queryClient } = Route.useRouteContext();
	const warriorsCollection = getWarriorsCollection(queryClient);
	const warbandsCollection = getWarbandsCollection(queryClient);
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: warbands } = useLiveQuery({
		query: (q) =>
			q
				.from({ warband: warbandsCollection })
				.orderBy(({ warband }) => warband.name),
	});
	const initialValues: WarriorFormValues = {
		name: "",
		class: "",
		status: "Alive",
		warbandId: warbands[0]?.id ?? "",
		knocked: 0,
		injuries: 0,
		knockedDowns: 0,
	};

	return (
		<div className="mx-auto max-w-3xl">
			<Link
				className="text-sm text-muted-foreground hover:text-primary/80"
				to="/warriors"
			>
				← Warriors
			</Link>
			<header className="mt-7 border-b border-border pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
					Recruitment
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-foreground">
					New warrior
				</h1>
				<p className="mt-2 text-muted-foreground">
					Add a new fighter to a campaign warband.
				</p>
			</header>

			{warbands.length ? (
				<Card className="mt-7">
					<CardContent>
						<WarriorForm
							initialValues={initialValues}
							onSubmit={async (values) => {
								const id = safeRandomUUID();
								const transaction = warriorsCollection.insert({
									id,
									...values,
								});
								await transaction.isPersisted.promise;
								await navigate({
									to: "/warriors/$warriorId",
									params: { warriorId: id },
								});
							}}
							submitLabel="Create warrior"
							warbands={warbands}
						/>
					</CardContent>
				</Card>
			) : (
				<section className="mt-7 rounded-xl border border-dashed border-input px-6 py-12 text-center">
					<h2 className="font-serif text-2xl text-foreground">
						A warband is required
					</h2>
					<p className="mt-2 text-muted-foreground">
						Create a warband before recruiting a warrior.
					</p>
					<Link
						className="mt-5 inline-flex text-primary hover:text-primary/80"
						to="/warbands/new"
					>
						Create a warband →
					</Link>
				</section>
			)}
		</div>
	);
}
