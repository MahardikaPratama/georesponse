/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Root application component. Renders the GeoResponse shell.
 *                Resource management, search/filter, and map features are
 *                implemented incrementally on top of this.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Reset to a clean GeoResponse shell, replacing the
 *                        prior project's AIS/ADS-B simulator entry point.
 */
import React from "react";

function App() {
	return (
		<div className="w-screen h-screen overflow-hidden text-white bg-background-100-1">
			<h1 className="p-4 text-2xl font-bold">GeoResponse</h1>
		</div>
	);
}

export default App;
