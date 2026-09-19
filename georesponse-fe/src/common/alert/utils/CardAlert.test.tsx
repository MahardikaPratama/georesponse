/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Card Alert Unit Test.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React from "react";

import { render, screen } from "@testing-library/react";

import Card from "./CardAlert";

describe("Card Component", () => {
	it("should render Card with custom className", () => {
		render(<Card className="custom-class">Card Content</Card>);
		const cardElement = screen.getByText("Card Content");
		expect(cardElement).toBeInTheDocument();
	});

	it("should render Card.Header with custom className", () => {
		render(
			<Card>
				<Card.Header className="header-class">Header Content</Card.Header>
			</Card>
		);
		const headerElement = screen.getByText("Header Content");
		expect(headerElement).toBeInTheDocument();
		expect(headerElement).toHaveClass("header-class");
	});

	it("should render default content in Card.Header when no children are passed", () => {
		render(
			<Card>
				<Card.Header />
			</Card>
		);
		const headerElement = screen.getByText("Default Header");
		expect(headerElement).toBeInTheDocument();
	});

	it("should render Card.Content with custom className", () => {
		render(
			<Card>
				<Card.Content className="content-class">Content Here</Card.Content>
			</Card>
		);
		const contentElement = screen.getByText("Content Here");
		expect(contentElement).toBeInTheDocument();
		expect(contentElement).toHaveClass("content-class");
	});

	it("should render default content in Card.Content when no children are passed", () => {
		render(
			<Card>
				<Card.Content />
			</Card>
		);
		const contentElement = screen.getByText("Default Content");
		expect(contentElement).toBeInTheDocument();
	});

	it("should render both Card.Header and Card.Content", () => {
		render(
			<Card>
				<Card.Header>Header</Card.Header>
				<Card.Content>Content</Card.Content>
			</Card>
		);
		const headerElement = screen.getByText("Header");
		const contentElement = screen.getByText("Content");

		expect(headerElement).toBeInTheDocument();
		expect(contentElement).toBeInTheDocument();
	});
});
