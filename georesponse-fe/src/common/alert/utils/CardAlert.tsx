/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Component for adding alert to a card component
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React, { ReactNode, createContext, useMemo } from "react";

interface CardProps {
	className?: string;
	children: ReactNode;
	style?: React.CSSProperties;
}

interface CardSubProps {
	className?: string;
	children?: ReactNode;
}

const CardContext = createContext({});

/**
 * `Card` is a container UI component that provides consistent padding and rounded styling.
 * It uses React context and supports nested `Card.Header` and `Card.Content` components.
 *
 * @param {CardProps} props - Props passed to the Card component.
 * @param {React.ReactNode} props.children - The content to render inside the Card.
 * @param {string} [props.className] - Optional className for additional styling.
 * @returns {JSX.Element} A styled card container component.
 */
const Card: React.FC<CardProps> & {
	Header: React.FC<CardSubProps>;
	Content: React.FC<CardSubProps>;
} = ({ children, className = "", style }) => {
	const contextValue = useMemo(() => ({}), []);

	return (
		<div className={`p-2 rounded-md ${className}`} style={style}>
			<CardContext.Provider value={contextValue}>
				{children}
			</CardContext.Provider>
		</div>
	);
};

Card.Header = ({ className = "", children }: CardSubProps) => {
	return <header className={className}>{children ?? "Default Header"}</header>;
};

Card.Content = ({ className = "", children }: CardSubProps) => {
	return (
		<section className={className}>{children ?? "Default Content"}</section>
	);
};

export default Card;
