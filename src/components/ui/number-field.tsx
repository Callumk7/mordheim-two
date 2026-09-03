"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type * as React from "react";
import {
	Button as ButtonPrimitive,
	FieldError as FieldErrorPrimitive,
	Group as GroupPrimitive,
	Input as InputPrimitive,
	NumberField as NumberFieldPrimitive,
	type NumberFieldProps as NumberFieldPrimitiveProps,
	Text as TextPrimitive,
	type ValidationResult,
} from "react-aria-components";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface NumberFieldProps extends NumberFieldPrimitiveProps {
	label?: React.ReactNode;
	description?: React.ReactNode;
	descriptionClassName?: string;
	errorClassName?: string;
	errorMessage?:
		| React.ReactNode
		| ((validation: ValidationResult) => React.ReactNode);
	groupClassName?: string;
	inputClassName?: string;
	placeholder?: string;
}

function NumberField({
	label,
	description,
	descriptionClassName,
	errorClassName,
	errorMessage,
	groupClassName,
	inputClassName,
	placeholder,
	className,
	...props
}: NumberFieldProps) {
	return (
		<NumberFieldPrimitive
			data-slot="number-field"
			className={cn("group/number-field flex w-full flex-col gap-2", className)}
			{...props}
		>
			{label != null && <Label>{label}</Label>}
			<GroupPrimitive
				data-slot="number-field-group"
				className={cn(
					"flex h-9 w-full min-w-0 overflow-hidden rounded-4xl border border-input bg-input/30 transition-colors outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 group-data-[disabled]/number-field:pointer-events-none group-data-[disabled]/number-field:cursor-not-allowed group-data-[disabled]/number-field:opacity-50 group-data-[invalid]/number-field:border-destructive group-data-[invalid]/number-field:ring-[3px] group-data-[invalid]/number-field:ring-destructive/20 dark:group-data-[invalid]/number-field:border-destructive/50 dark:group-data-[invalid]/number-field:ring-destructive/40",
					groupClassName,
				)}
			>
				<InputPrimitive
					data-slot="number-field-input"
					className={cn(
						"h-full min-w-0 flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm",
						inputClassName,
					)}
					placeholder={placeholder}
				/>
				<div
					data-slot="number-field-stepper"
					className="flex w-8 shrink-0 flex-col border-l border-input"
				>
					<NumberFieldStepperButton slot="increment">
						<ChevronUpIcon aria-hidden="true" />
					</NumberFieldStepperButton>
					<NumberFieldStepperButton
						className="border-t border-input"
						slot="decrement"
					>
						<ChevronDownIcon aria-hidden="true" />
					</NumberFieldStepperButton>
				</div>
			</GroupPrimitive>
			{description != null && (
				<TextPrimitive
					data-slot="field-description"
					slot="description"
					className={cn(
						"text-left text-sm leading-normal font-normal text-muted-foreground",
						descriptionClassName,
					)}
				>
					{description}
				</TextPrimitive>
			)}
			<FieldErrorPrimitive
				data-slot="field-error"
				className={cn("text-sm font-normal text-destructive", errorClassName)}
			>
				{errorMessage}
			</FieldErrorPrimitive>
		</NumberFieldPrimitive>
	);
}

function NumberFieldStepperButton({
	className,
	...props
}: React.ComponentProps<typeof ButtonPrimitive>) {
	return (
		<ButtonPrimitive
			className={cn(
				"flex min-h-0 flex-1 cursor-default items-center justify-center bg-transparent text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground pressed:bg-muted disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3",
				className,
			)}
			{...props}
		/>
	);
}

export { NumberField, type NumberFieldProps };
