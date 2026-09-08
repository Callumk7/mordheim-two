import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { WarriorForm, type WarriorFormValues } from "@/components/warrior-form";
import type { Warband } from "@/db/warband";

export function CreateWarriorDialog({
	isOpen,
	onOpenChange,
	onSubmit,
	warband,
}: {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: (values: WarriorFormValues) => Promise<void>;
	warband: Warband;
}) {
	return (
		<Dialog
			className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
			isOpen={isOpen}
			onOpenChange={onOpenChange}
		>
			<DialogHeader>
				<DialogTitle>Add warrior</DialogTitle>
				<DialogDescription>
					Recruit a fighter for {warband.name}.
				</DialogDescription>
			</DialogHeader>
			<WarriorForm
				initialValues={{
					name: "",
					class: "",
					status: "Alive",
					warbandId: warband.id,
					knocked: 0,
					injuries: 0,
					knockedDowns: 0,
				}}
				isWarbandLocked
				key={isOpen ? `new-${warband.id}` : "new-closed"}
				onSubmit={async (values) => {
					await onSubmit(values);
					onOpenChange(false);
				}}
				submitLabel="Recruit warrior"
				warbandLockDescription="This warrior will serve this warband."
				warbands={[warband]}
			/>
		</Dialog>
	);
}
