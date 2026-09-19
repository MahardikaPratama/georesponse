/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Entry point that renders the App component into the root
 *                DOM node.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation for GeoResponse.
 */
import React from "react";
import ReactDOM from "react-dom/client";

import App  from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
