// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageGenerationSettingsForm } from "@/components/image-generation-settings-form";
import { IMAGE_GENERATION_INSTRUCTIONS_MAX_LENGTH } from "@/db/validation/image-generation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("@/components/ui/button", () => ({
	Button: ({
		children,
		isDisabled,
		type = "button",
	}: Record<string, unknown>) => (
		<button disabled={Boolean(isDisabled)} type={type as "button" | "submit"}>
			{children as React.ReactNode}
		</button>
	),
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
});

async function renderForm({
	initialInstructions = "Default brief",
	isCustom = false,
	onSave = vi.fn(async () => undefined),
}: {
	initialInstructions?: string;
	isCustom?: boolean;
	onSave?: (instructions: string) => Promise<void>;
} = {}) {
	await act(async () => {
		root.render(
			<ImageGenerationSettingsForm
				initialInstructions={initialInstructions}
				isCustom={isCustom}
				onSave={onSave}
			/>,
		);
	});
	return { onSave };
}

async function submitForm() {
	await act(async () => {
		container.querySelector("form")?.requestSubmit();
	});
}

describe("ImageGenerationSettingsForm", () => {
	it("renders the initial instructions and default status", async () => {
		await renderForm();
		expect(container.querySelector("textarea")?.value).toBe("Default brief");
		expect(container.textContent).toContain(
			"Showing the default John Blanche refinement brief.",
		);
	});

	it("blocks empty or whitespace-only saves without calling onSave", async () => {
		const { onSave } = await renderForm({ initialInstructions: "   " });
		await submitForm();
		expect(onSave).not.toHaveBeenCalled();
		expect(container.textContent).toContain(
			"Enter image-generation instructions.",
		);
	});

	it("blocks over-limit saves without calling onSave", async () => {
		const { onSave } = await renderForm({
			initialInstructions: "x".repeat(
				IMAGE_GENERATION_INSTRUCTIONS_MAX_LENGTH + 1,
			),
		});
		await submitForm();
		expect(onSave).not.toHaveBeenCalled();
		expect(container.textContent).toContain(
			`Instructions must be at most ${IMAGE_GENERATION_INSTRUCTIONS_MAX_LENGTH} characters.`,
		);
	});

	it("saves valid instructions and shows confirmation", async () => {
		const onSave = vi.fn(async () => undefined);
		await renderForm({
			initialInstructions: "Paint like a woodcut.",
			isCustom: true,
			onSave,
		});
		await submitForm();
		expect(onSave).toHaveBeenCalledExactlyOnceWith("Paint like a woodcut.");
		expect(container.textContent).toContain(
			"Saved image-generation instructions.",
		);
	});
});
