/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Unit test for Button component covering rendering logic, variants,
 *                colors, sizes, loading state, and fullWidth behavior.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React from "react";

import { render, screen } from "@testing-library/react";

import { Button } from "./Button";

describe("Button Component", () => {
	it("should render correctly with default props", () => {
		render(<Button>OK</Button>);
		const button = screen.getByRole("button", { name: /ok/i });
		expect(button).toBeInTheDocument();
		expect(button).toHaveClass("bg-primary-20 text-white");
		expect(button).toHaveClass("h-12 px-[18px] text-base font-semibold");
		expect(button).not.toHaveClass("w-full");
	});

	it("should have outline variant styles", () => {
		render(<Button variant="outline">Outline</Button>);
		const button = screen.getByRole("button", { name: /outline/i });
		expect(button).toHaveClass("border border-primary-20 text-primary-20");
	});

	it("should have ghost variant styles", () => {
		render(<Button variant="ghost">Ghost</Button>);
		const button = screen.getByRole("button", { name: /ghost/i });
		expect(button).toHaveClass("bg-transparent text-primary-20");
	});

	it("should have loading state", () => {
		render(<Button loading>Loading</Button>);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("bg-primary-green-1 text-white");
		expect(button).toHaveClass("cursor-wait");
		expect(screen.getByTestId("dot-loading")).toBeInTheDocument();
	});

	it("should have fullWidth styles", () => {
		render(<Button fullWidth>Full Width</Button>);
		const button = screen.getByRole("button", { name: /full width/i });
		expect(button).toHaveClass("w-full");
	});

	it("should have disabled state", () => {
		render(<Button disabled>Disabled</Button>);
		const button = screen.getByRole("button", { name: /disabled/i });
		expect(button).toHaveClass("opacity-60 cursor-not-allowed");
	});

	describe("Color Variants", () => {
		it("should render primary color (default)", () => {
			render(<Button color="primary">Primary</Button>);
			const button = screen.getByRole("button", { name: /primary/i });
			expect(button).toHaveClass("bg-primary-20 text-white");
		});

		it("should render error color", () => {
			render(<Button color="error">Error</Button>);
			const button = screen.getByRole("button", { name: /error/i });
			expect(button).toHaveClass("bg-btn-error text-white");
		});

		it("should render success color", () => {
			render(<Button color="success">Success</Button>);
			const button = screen.getByRole("button", { name: /success/i });
			expect(button).toHaveClass("bg-btn-success text-white");
		});

		it("should render warning color", () => {
			render(<Button color="warning">Warning</Button>);
			const button = screen.getByRole("button", { name: /warning/i });
			expect(button).toHaveClass("bg-yellow-500 text-white");
		});

		it("should render gray color", () => {
			render(<Button color="gray">Gray</Button>);
			const button = screen.getByRole("button", { name: /gray/i });
			expect(button).toHaveClass("bg-gray-600 text-white");
		});
	});
});
