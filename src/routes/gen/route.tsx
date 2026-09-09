import { createFileRoute } from "@tanstack/react-router";
import { generateServerFunction } from "@/services/gemini";

export const Route = createFileRoute("/gen")({
	component: RouteComponent,
	loader: () => generateServerFunction(),
});

function RouteComponent() {
	const load = Route.useLoaderData();
	return (
		<div className="whitespace-pre-wrap">{JSON.stringify(load, null, 2)}</div>
	);
}
