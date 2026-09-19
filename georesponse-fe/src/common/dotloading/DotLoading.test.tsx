/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Unit test for DotLoading component, verifying direction, dot
 *                rendering, and animation delay classes.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React from "react";

import "@testing-library/jest-dom";
import { render } from "@testing-library/react";

import DotLoading from "./DotLoading";

describe("DotLoading Component", () => {
	it("renders without crashing", () => {
		render(<DotLoading />);
	});

	it("renders exactly four animated dots", () => {
		const { container } = render(<DotLoading />);
		const dots = container.querySelectorAll(".dot");

		expect(dots).toHaveLength(4);
	});

	it("applies delay classes correctly", () => {
		const { container } = render(<DotLoading />);
		expect(container.querySelector(".dot.delay-1")).toBeInTheDocument();
		expect(container.querySelector(".dot.delay-2")).toBeInTheDocument();
		expect(container.querySelector(".dot.delay-3")).toBeInTheDocument();
	});

	it("renders direction row by default (right)", () => {
		const { container } = render(<DotLoading />);
		const wrapper = container.firstChild as HTMLElement;

		expect(wrapper).toHaveStyle("flex-direction: row-reverse");
	});

	it("renders direction row-reverse for left", () => {
		const { container } = render(<DotLoading direction="left" />);
		const wrapper = container.firstChild as HTMLElement;

		expect(wrapper).toHaveStyle("flex-direction: row-reverse");
	});

	it("renders direction column for down", () => {
		const { container } = render(<DotLoading direction="down" />);
		const wrapper = container.firstChild as HTMLElement;

		expect(wrapper).toHaveStyle("flex-direction: column");
	});

	it("renders direction column-reverse for up", () => {
		const { container } = render(<DotLoading direction="up" />);
		const wrapper = container.firstChild as HTMLElement;

		expect(wrapper).toHaveStyle("flex-direction: column-reverse");
	});

	it("renders direction row for right", () => {
		const { container } = render(<DotLoading direction="right" />);
		const wrapper = container.firstChild as HTMLElement;

		expect(wrapper).toHaveStyle("flex-direction: row");
	});
});
