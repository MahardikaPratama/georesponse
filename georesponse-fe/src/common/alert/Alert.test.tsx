/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Unit test for Alert component covering rendering logic, auto-close
 *                timing, and position behavior.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";

import Alert, { AlertProps } from "./Alert";
import "./Alert.css";

describe("Alert component", () => {
	it("renders alert when isOpen is true", () => {
		render(<Alert isOpen={true} handleClose={() => {}} />);
		expect(screen.getByTestId("title")).toBeInTheDocument();
	});

	it("renders alert with title and message", () => {
		render(
			<Alert
				isOpen={true}
				title="Test Title"
				message="Test Message"
				handleClose={() => {}}
			/>
		);
		expect(screen.getByTestId("title")).toHaveTextContent("Test Title");
		expect(screen.getByTestId("message")).toHaveTextContent("Test Message");
	});

	it("renders alert with default (empty) title and message", () => {
		render(<Alert isOpen={true} handleClose={() => {}} />);
		expect(screen.getByTestId("title")).toHaveTextContent("");
		expect(screen.getByTestId("message")).toHaveTextContent("");
	});

	it("closes alert when close icon is clicked", () => {
		const handleClose = vi.fn();
		render(<Alert isOpen={true} handleClose={handleClose} />);
		fireEvent.click(screen.getByTestId("close"));
		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it("does not render anything when isOpen is false", () => {
		render(<Alert isOpen={false} handleClose={() => {}} />);
		expect(screen.queryByTestId("title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("message")).not.toBeInTheDocument();
	});

	it("adds fade-out class after 3 seconds", () => {
		vi.useFakeTimers();
		render(<Alert isOpen={true} handleClose={() => {}} />);
		act(() => {
			vi.advanceTimersByTime(3000);
		});
		const rootDiv = screen.getByTestId("alert-container");
		expect(rootDiv.className).toContain("fade-out");
		vi.useRealTimers();
	});

	it("applies the correct position class for bottom-left", () => {
		render(
			<Alert isOpen={true} handleClose={() => {}} position="bottom-left" />
		);
		const alertWrapper = screen
			.getByTestId("title")
			.closest("div[data-testid]");
		expect(alertWrapper?.className).toContain("bottom-4 left-4");
	});

	it("applies the correct position classes for all positions", () => {
		const positions: Array<{
			position: NonNullable<AlertProps["position"]>;
			expectedClass: string;
		}> = [
			{
				position: "top-center",
				expectedClass: "top-32 left-1/2 transform -translate-x-1/2"
			},
			{
				position: "left-center",
				expectedClass: "top-1/2 left-12 transform -translate-y-1/2"
			},
			{ position: "bottom-left", expectedClass: "bottom-4 left-4" },
			{ position: "bottom-right", expectedClass: "bottom-4 right-4" },
			{ position: "top-right", expectedClass: "top-4 right-4" },
			{ position: "top-left", expectedClass: "top-4 left-4" }
		];

		positions.forEach(({ position, expectedClass }) => {
			const { unmount } = render(
				<Alert isOpen={true} handleClose={() => {}} position={position} />
			);
			const alertContainer = screen.getByTestId("alert-container");
			expect(alertContainer.className).toContain(expectedClass);
			unmount();
		});
	});

	it("renders with success variant and correct styling", () => {
		render(
			<Alert
				isOpen={true}
				handleClose={() => {}}
				variant="success"
				title="Success"
				message="Operation completed"
			/>
		);
		const title = screen.getByTestId("title");
		expect(title).toHaveStyle({ color: "#156D55" });
	});

	it("renders with error variant (default) and correct styling", () => {
		render(
			<Alert
				isOpen={true}
				handleClose={() => {}}
				title="Error"
				message="Something went wrong"
			/>
		);
		const title = screen.getByTestId("title");
		expect(title).toHaveStyle({ color: "#C13B3B" });
	});

	it("applies red text class when isTextRed is true", () => {
		render(
			<Alert
				isOpen={true}
				handleClose={() => {}}
				message="Error message"
				isTextRed={true}
			/>
		);
		const message = screen.getByTestId("message");
		expect(message).toHaveClass("text-red-500");
	});

	it("applies default text color when isTextRed is false", () => {
		render(
			<Alert
				isOpen={true}
				handleClose={() => {}}
				message="Normal message"
				isTextRed={false}
			/>
		);
		const message = screen.getByTestId("message");
		expect(message).toHaveClass("text-[#6e6f6e]");
	});

	it("handles invalid position by defaulting to top-center", () => {
		render(
			<Alert
				isOpen={true}
				handleClose={() => {}}
				position={"invalid-position" as any}
			/>
		);
		const alertContainer = screen.getByTestId("alert-container");
		expect(alertContainer.className).toContain(
			"top-32 left-1/2 transform -translate-x-1/2"
		);
	});

	it("triggers mouse enter and leave events", () => {
		vi.useFakeTimers();
		render(<Alert isOpen={true} handleClose={() => {}} />);
		const alertContainer = screen.getByTestId("alert-container");

		fireEvent.mouseEnter(alertContainer);

		act(() => {
			vi.advanceTimersByTime(6000);
		});

		expect(alertContainer).not.toHaveClass("fade-out");

		fireEvent.mouseLeave(alertContainer);

		act(() => {
			vi.advanceTimersByTime(3100);
		});

		expect(alertContainer).toHaveClass("fade-out");
		vi.useRealTimers();
	});

	it("completes full timer cycle and auto-closes", () => {
		vi.useFakeTimers();
		const handleClose = vi.fn();
		render(<Alert isOpen={true} handleClose={handleClose} />);

		act(() => {
			vi.advanceTimersByTime(5100);
		});

		act(() => {
			vi.runOnlyPendingTimers();
		});

		expect(handleClose).toHaveBeenCalledTimes(1);
		vi.useRealTimers();
	});

	it("covers getPositionClass default parameter when position is undefined", () => {
		render(<Alert handleClose={() => {}} />);
		const alertContainer = screen.queryByTestId("alert-container");
		expect(alertContainer).not.toBeInTheDocument();
	});

	it("covers getPositionClass function with no position argument", () => {
		render(<Alert isOpen={true} handleClose={() => {}} />);
		const alertContainer = screen.getByTestId("alert-container");

		expect(alertContainer.className).toContain(
			"top-32 left-1/2 transform -translate-x-1/2"
		);
	});

	it("covers getPositionClass default parameter with null position", () => {
		render(
			<Alert isOpen={true} handleClose={() => {}} position={null as any} />
		);
		const alertContainer = screen.getByTestId("alert-container");

		expect(alertContainer.className).toContain(
			"top-32 left-1/2 transform -translate-x-1/2"
		);
	});

	it("covers all edge cases for position parameter", () => {
		const falsyValues = [undefined, null, "" as any, false as any];

		falsyValues.forEach((position) => {
			const { unmount } = render(
				<Alert isOpen={true} handleClose={() => {}} position={position} />
			);
			const alertContainer = screen.getByTestId("alert-container");

			expect(alertContainer.className).toContain(
				"top-32 left-1/2 transform -translate-x-1/2"
			);
			unmount();
		});
	});

	it("covers Alert component default parameters", () => {
		render(<Alert handleClose={() => {}} />);

		expect(screen.queryByTestId("alert-container")).not.toBeInTheDocument();

		render(<Alert isOpen handleClose={() => {}} />);
		const alertContainer = screen.getByTestId("alert-container");
		expect(alertContainer.className).toContain(
			"top-32 left-1/2 transform -translate-x-1/2"
		);
	});

	it("handles undefined position correctly (defaults to top-center)", () => {
		render(<Alert isOpen={true} handleClose={() => {}} position={undefined} />);
		const alertContainer = screen.getByTestId("alert-container");
		expect(alertContainer.className).toContain(
			"top-32 left-1/2 transform -translate-x-1/2"
		);
	});

	it("handles invalid position by defaulting to top-center", () => {
		render(
			<Alert
				isOpen={true}
				handleClose={() => {}}
				position={"invalid-position" as any}
			/>
		);
		const alertContainer = screen.getByTestId("alert-container");
		expect(alertContainer.className).toContain(
			"top-32 left-1/2 transform -translate-x-1/2"
		);
	});

	it("applies the correct position classes for all positions", () => {
		const positions: Array<{
			position: NonNullable<AlertProps["position"]>;
			expectedClass: string;
		}> = [
			{
				position: "top-center",
				expectedClass: "top-32 left-1/2 transform -translate-x-1/2"
			},
			{
				position: "left-center",
				expectedClass: "top-1/2 left-12 transform -translate-y-1/2"
			},
			{ position: "bottom-left", expectedClass: "bottom-4 left-4" },
			{ position: "bottom-right", expectedClass: "bottom-4 right-4" },
			{ position: "top-right", expectedClass: "top-4 right-4" },
			{ position: "top-left", expectedClass: "top-4 left-4" }
		];

		positions.forEach(({ position, expectedClass }) => {
			const { unmount } = render(
				<Alert isOpen={true} handleClose={() => {}} position={position} />
			);
			const alertContainer = screen.getByTestId("alert-container");
			expect(alertContainer.className).toContain(expectedClass);
			unmount();
		});
	});

	it("renders with success variant and correct styling", () => {
		render(
			<Alert
				isOpen={true}
				handleClose={() => {}}
				variant="success"
				title="Success"
				message="Operation completed"
			/>
		);
		const title = screen.getByTestId("title");
		expect(title).toHaveStyle({ color: "#156D55" });
	});

	it("renders with error variant (default) and correct styling", () => {
		render(
			<Alert
				isOpen={true}
				handleClose={() => {}}
				title="Error"
				message="Something went wrong"
			/>
		);
		const title = screen.getByTestId("title");
		expect(title).toHaveStyle({ color: "#C13B3B" });
	});

	it("applies red text class when isTextRed is true", () => {
		render(
			<Alert
				isOpen={true}
				handleClose={() => {}}
				message="Error message"
				isTextRed={true}
			/>
		);
		const message = screen.getByTestId("message");
		expect(message).toHaveClass("text-red-500");
	});

	it("applies default text color when isTextRed is false", () => {
		render(
			<Alert
				isOpen={true}
				handleClose={() => {}}
				message="Normal message"
				isTextRed={false}
			/>
		);
		const message = screen.getByTestId("message");
		expect(message).toHaveClass("text-[#6e6f6e]");
	});

	it("triggers mouse enter and leave events", () => {
		vi.useFakeTimers();
		render(<Alert isOpen={true} handleClose={() => {}} />);
		const alertContainer = screen.getByTestId("alert-container");

		fireEvent.mouseEnter(alertContainer);

		act(() => {
			vi.advanceTimersByTime(6000);
		});

		expect(alertContainer).not.toHaveClass("fade-out");

		fireEvent.mouseLeave(alertContainer);

		act(() => {
			vi.advanceTimersByTime(3100);
		});

		expect(alertContainer).toHaveClass("fade-out");
		vi.useRealTimers();
	});

	it("pauses timer when hovered and resumes when not hovered", () => {
		vi.useFakeTimers();
		render(<Alert isOpen={true} handleClose={() => {}} />);
		const alertContainer = screen.getByTestId("alert-container");

		fireEvent.mouseEnter(alertContainer);

		act(() => {
			vi.advanceTimersByTime(3500);
		});

		expect(alertContainer).not.toHaveClass("fade-out");

		fireEvent.mouseLeave(alertContainer);

		act(() => {
			vi.advanceTimersByTime(3100);
		});

		expect(alertContainer).toHaveClass("fade-out");
		vi.useRealTimers();
	});

	it("automatically closes after timer expires", () => {
		vi.useFakeTimers();
		const handleClose = vi.fn();
		render(<Alert isOpen={true} handleClose={handleClose} />);

		act(() => {
			vi.advanceTimersByTime(5100);
		});

		act(() => {
			vi.runOnlyPendingTimers();
		});

		expect(handleClose).toHaveBeenCalledTimes(1);
		vi.useRealTimers();
	});

	it("resets timer and fade state when isOpen changes from true to false", () => {
		vi.useFakeTimers();
		const { rerender } = render(<Alert isOpen={true} handleClose={() => {}} />);

		act(() => {
			vi.advanceTimersByTime(3100);
		});

		let alertContainer = screen.getByTestId("alert-container");
		expect(alertContainer).toHaveClass("fade-out");

		rerender(<Alert isOpen={false} handleClose={() => {}} />);
		rerender(<Alert isOpen={true} handleClose={() => {}} />);

		alertContainer = screen.getByTestId("alert-container");
		expect(alertContainer).not.toHaveClass("fade-out");

		vi.useRealTimers();
	});
});
