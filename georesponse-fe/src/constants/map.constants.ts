/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-20
 * Description  : The single source of resource-marker styling on the map
 *                (selected ring, marker outline), shared by the map
 *                adapter and MapLegend so the legend can never drift from
 *                what is actually painted.
 *
 * Changelog:
 * - 1.0.0 (2026-09-20): Initial creation.
 */
import colors from "@utils/colors";

export const SELECTED_MARKER_COLOR = colors.map.selected;
export const MARKER_STROKE_COLOR = colors.map.markerStroke;
