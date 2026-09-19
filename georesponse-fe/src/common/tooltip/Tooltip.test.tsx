/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Unit tests for Tooltip component covering rendering, interaction,
 *                and styling.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import Tooltip from "./Tooltip";

// @testing-library/user-event isn't a project dependency; fireEvent's
// mouseEnter/mouseLeave cover everything these tests need (Tooltip only
// listens for onMouseEnter/onMouseLeave/onMouseMove).
const userEvent = {
	hover: (el: Element) => fireEvent.mouseEnter(el),
	unhover: (el: Element) => fireEvent.mouseLeave(el)
};

describe("Tooltip", () => {
	it("renders children", () => {
		render(
			<Tooltip content="Tooltip text">
				<span data-testid="child">Child</span>
			</Tooltip>
		);
		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("does not show tooltip by default", () => {
		render(
			<Tooltip content="Tooltip text">
				<span>Hover me</span>
			</Tooltip>
		);
		expect(screen.queryByText("Tooltip text")).not.toBeInTheDocument();
	});

	it("shows tooltip on mouse enter", async () => {
		render(
			<Tooltip content="Tooltip text">
				<span>Hover me</span>
			</Tooltip>
		);
		await userEvent.hover(screen.getByRole("button"));
		expect(await screen.findByText("Tooltip text")).toBeInTheDocument();
	});

	it("shows tooltip on mouse move", async () => {
		render(
			<Tooltip content="Tooltip text">
				<span>Hover me</span>
			</Tooltip>
		);
		const btn = screen.getByRole("button");
		btn.dispatchEvent(
			new MouseEvent("mousemove", { bubbles: true, clientX: 10, clientY: 20 })
		);
		expect(await screen.findByText("Tooltip text")).toBeInTheDocument();
	});

	it("hides tooltip on mouse leave", async () => {
		render(
			<Tooltip content="Tooltip text">
				<span>Hover me</span>
			</Tooltip>
		);
		const btn = screen.getByRole("button");
		await userEvent.hover(btn);
		expect(await screen.findByText("Tooltip text")).toBeInTheDocument();
		await userEvent.unhover(btn);
		expect(screen.queryByText("Tooltip text")).not.toBeInTheDocument();
	});

	it("does not show tooltip if disabled", async () => {
		render(
			<Tooltip content="Tooltip text" disabled>
				<span>Hover me</span>
			</Tooltip>
		);
		await userEvent.hover(screen.getByRole("button"));
		expect(screen.queryByText("Tooltip text")).not.toBeInTheDocument();
	});

	it("does not show tooltip if content is empty", async () => {
		render(
			<Tooltip content="">
				<span>Hover me</span>
			</Tooltip>
		);
		await userEvent.hover(screen.getByRole("button"));
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
	});

	it("applies custom className to tooltip", async () => {
		render(
			<Tooltip content="Tooltip text" className="custom-tooltip">
				<span>Hover me</span>
			</Tooltip>
		);
		await userEvent.hover(screen.getByRole("button"));
		const tooltip = await screen.findByText("Tooltip text");
		expect(tooltip).toHaveClass("custom-tooltip");
	});

	it("applies custom offsetX and offsetY", async () => {
		render(
			<Tooltip content="Tooltip text" offsetX={100} offsetY={50}>
				<span>Hover me</span>
			</Tooltip>
		);
		const btn = screen.getByRole("button");
		await userEvent.hover(btn);
		btn.dispatchEvent(
			new MouseEvent("mousemove", { bubbles: true, clientX: 10, clientY: 20 })
		);
		const tooltip = await screen.findByText("Tooltip text");
		expect(tooltip).toHaveStyle({ left: "110px", top: "70px" });
	});

	it("matches snapshot when visible", async () => {
		const { container } = render(
			<Tooltip content="Tooltip text">
				<span>Hover me</span>
			</Tooltip>
		);
		await userEvent.hover(screen.getByRole("button"));
		expect(container).toMatchSnapshot();
	});
});
