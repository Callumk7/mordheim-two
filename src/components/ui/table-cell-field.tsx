import type { ComponentProps } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./select";

const tableCellControlClassName =
	"-mx-1 h-8 w-[calc(100%+0.5rem)] rounded-sm border-transparent bg-transparent px-1 py-0 text-sm shadow-none hover:border-input hover:bg-input/20 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/50 disabled:bg-transparent";

type TableCellInputProps = Omit<
	ComponentProps<typeof Input>,
	| "aria-describedby"
	| "aria-invalid"
	| "onBlur"
	| "onChange"
	| "onFocus"
	| "onKeyDown"
	| "value"
> & {
	className?: string;
	onCommit: (value: string) => Promise<void> | void;
	validate?: (value: string) => string | undefined;
	value: number | string;
};

function TableCellInput({
	className,
	onCommit,
	validate,
	value,
	...props
}: TableCellInputProps) {
	const [draft, setDraft] = useState(String(value));
	const [error, setError] = useState<string>();
	const [isSaving, setIsSaving] = useState(false);
	const isFocused = useRef(false);
	const skipNextCommit = useRef(false);
	const errorId = useId();

	useEffect(() => {
		if (!isFocused.current) setDraft(String(value));
	}, [value]);

	async function commit() {
		if (skipNextCommit.current) {
			skipNextCommit.current = false;
			return;
		}

		const validationError = validate?.(draft);
		if (validationError) {
			setError(validationError);
			return;
		}

		if (draft === String(value)) {
			setError(undefined);
			return;
		}

		setError(undefined);
		setIsSaving(true);
		try {
			await onCommit(draft);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Unable to save change.",
			);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<>
			<Input
				aria-busy={isSaving || undefined}
				aria-describedby={error ? errorId : undefined}
				aria-invalid={Boolean(error)}
				className={cn(tableCellControlClassName, className)}
				onBlur={() => {
					isFocused.current = false;
					void commit();
				}}
				onChange={(event) => {
					setDraft(event.target.value);
					if (error) setError(validate?.(event.target.value));
				}}
				onFocus={() => {
					isFocused.current = true;
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						event.currentTarget.blur();
					} else if (event.key === "Escape") {
						event.preventDefault();
						skipNextCommit.current = true;
						setDraft(String(value));
						setError(undefined);
						event.currentTarget.blur();
					}
				}}
				value={draft}
				{...props}
			/>
			{error ? (
				<span className="sr-only" id={errorId} role="alert">
					{error}
				</span>
			) : null}
		</>
	);
}

interface TableCellSelectProps {
	"aria-label": string;
	className?: string;
	onCommit: (value: string) => Promise<void> | void;
	options: readonly string[];
	value: string;
}

function TableCellSelect({
	"aria-label": ariaLabel,
	className,
	onCommit,
	options,
	value,
}: TableCellSelectProps) {
	const [selectedValue, setSelectedValue] = useState(value);
	const [error, setError] = useState<string>();
	const [isSaving, setIsSaving] = useState(false);
	const errorId = useId();

	useEffect(() => setSelectedValue(value), [value]);

	return (
		<>
			<Select
				aria-busy={isSaving || undefined}
				aria-label={ariaLabel}
				className="w-full"
				isInvalid={Boolean(error)}
				onSelectionChange={async (key) => {
					const nextValue = String(key);
					setSelectedValue(nextValue);
					setError(undefined);
					setIsSaving(true);
					try {
						await onCommit(nextValue);
					} catch (cause) {
						setSelectedValue(value);
						setError(
							cause instanceof Error ? cause.message : "Unable to save change.",
						);
					} finally {
						setIsSaving(false);
					}
				}}
				selectedKey={selectedValue}
			>
				<SelectTrigger
					aria-describedby={error ? errorId : undefined}
					className={cn(
						tableCellControlClassName,
						"text-foreground",
						className,
					)}
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem id={option} key={option}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error ? (
				<span className="sr-only" id={errorId} role="alert">
					{error}
				</span>
			) : null}
		</>
	);
}

export { TableCellInput, TableCellSelect };
