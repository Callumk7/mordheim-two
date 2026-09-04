import { DbClient } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";

export function getContext() {
	const queryClient = new QueryClient();
	const dbClient = new DbClient({ queryClient });

	return {
		dbClient,
		queryClient,
	};
}
export default function TanstackQueryProvider() {}
