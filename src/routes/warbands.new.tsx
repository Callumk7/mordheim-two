import { safeRandomUUID } from "@tanstack/react-db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	WarbandForm,
	type WarbandFormValues,
} from "../components/warband-form";
import { getWarbandsCollection } from "../db-collections/warbands";

export const Route = createFileRoute("/warbands/new")({
	component: NewWarbandPage,
});

const initialValues: WarbandFormValues = {
	name: "",
	faction: "Mercenaries",
	captain: "",
	rating: 100,
	wins: 0,
	status: "Recruiting",
};

function NewWarbandPage() {
	const { queryClient } = Route.useRouteContext();
	const warbandsCollection = getWarbandsCollection(queryClient);
	const navigate = useNavigate({ from: Route.fullPath });

	return (
		<div className="mx-auto max-w-3xl">
			<Link
				className="text-sm text-muted-foreground hover:text-primary/80"
				to="/warbands"
			>
				← Warbands
			</Link>
			<header className="mt-7 border-b border-border pb-6">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
					Recruitment
				</p>
				<h1 className="mt-2 font-serif text-4xl font-semibold text-foreground">
					New warband
				</h1>
				<p className="mt-2 text-muted-foreground">
					Record a new company for the campaign.
				</p>
			</header>

			<section className="mt-7 rounded-xl border border-border bg-card p-6">
				<WarbandForm
					initialValues={initialValues}
					onSubmit={async (values) => {
						const id = safeRandomUUID();
						const transaction = warbandsCollection.insert({ id, ...values });
						await transaction.isPersisted.promise;
						await navigate({
							to: "/warbands/$warbandId",
							params: { warbandId: id },
						});
					}}
					submitLabel="Create warband"
				/>
			</section>
		</div>
	);
}
