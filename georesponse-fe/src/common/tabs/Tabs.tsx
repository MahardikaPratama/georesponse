/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Tabs component to switch between views using a list of
 *                tab buttons.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Adapted from a prior personal project for
 *                        GeoResponse.
 */
import React, { memo } from "react";

import { cn } from "@utils/cn";

import Card from "../card/Card";

type TabsProps<
	T extends {
		title: string;
		value: string;
	}
> = {
	tabsData: Readonly<T[]>;
	onTabChange: (tab: T["value"]) => void;
	resetStatesRowActiveTrackList?: () => void;
	currentTab: T["value"];
	tabContentClassName?: string;
	showBottomBorder?: boolean;
	tabFontSize?: string;
};

/**
 * A reusable tab component that renders a set of selectable tabs with custom styling and behavior.
 *
 * @template T - A type that must include `title` and `value` properties for each tab item.
 *
 * @param {Object} props - Props for the Tabs component.
 * @param {Readonly<T[]>} props.tabsData - The list of tab items to render.
 * @param {(value: T["value"]) => void} props.onTabChange - Callback triggered when a tab is selected.
 * @param {T["value"]} props.currentTab - The currently selected tab value.
 * @param {string} [props.tabContentClassName] - Optional class name for additional styling on each tab button.
 * @param {string} [props.tabFontSize] - Optional Tailwind font size class (e.g., "text-sm", "text-lg", "text-[18px]") for customizing tab title size.
 * @param props.resetStatesRowActiveTrackList - Optional for resetting states row track list when clicking tab track-generator
 * @param {boolean} [props.showBottomBorder=false] - Whether to show a bottom border under the tab section.
 *
 * @returns {JSX.Element} The rendered tab navigation component.
 */
function TabsComponent<
	T extends {
		title: string;
		value: string;
	}
>({
	tabsData,
	onTabChange,
	resetStatesRowActiveTrackList,
	currentTab,
	tabContentClassName,
	showBottomBorder = false,
	tabFontSize
}: Readonly<TabsProps<T>>) {
	return (
		<div>
			<Card className="p-0 pb-2 rounded-lg">
				<div className="flex flex-row w-full gap-2">
					{tabsData.map((tab) => (
						<button
							key={tab.title}
							className={cn(
								"rounded-lg bg-transparent px-2 py-2 font-semibold",
								tab.value === currentTab
									? "bg-bg2-100 bg-background-100-2"
									: "text-white/50 hover:text-white/100",
								tabFontSize,
								tabContentClassName
							)}
							onClick={() => {
								if (
									resetStatesRowActiveTrackList &&
									tab.value === "track-generator"
								) {
									resetStatesRowActiveTrackList();
								}
								onTabChange(tab.value);
							}}
							data-testid={`tab-${tab.value}`}
						>
							{tab.title}
						</button>
					))}
				</div>
			</Card>
			{showBottomBorder && (
				<div className="w-1/2 my-1 border-b border-white/20" />
			)}
		</div>
	);
}

const Tabs = memo(TabsComponent) as typeof TabsComponent;
export default Tabs;
