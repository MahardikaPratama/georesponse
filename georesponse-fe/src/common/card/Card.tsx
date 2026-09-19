/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : A reusable Card component with optional title and custom
 *                content styling.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import { cn } from "@utils/cn";

type CardProps = {
	title?: string;
	className?: string;
	children?: React.ReactNode;
};

/**
 * A reusable card component that displays a title and content area.
 *
 * @param {Object} props - The component props.
 * @param {string} [props.title] - Optional title displayed at the top of the card.
 * @param {React.ReactNode} props.children - The content to render inside the card.
 * @param {string} [props.className] - Optional additional class names for styling.
 * @returns {JSX.Element} The rendered card element.
 */
export default function Card({
	title,
	children,
	className
}: Readonly<CardProps>) {
	return (
		<div className={cn("rounded-2xl p-4", className)}>
			{title && <p className="mb-4 text-xl font-bold">{title}</p>}
			{children}
		</div>
	);
}
