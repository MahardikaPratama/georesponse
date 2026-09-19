/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Entry point that renders the App component into the root
 *                DOM node, wrapped in TanStack Query's provider so every
 *                hook in the app can use useQuery/useMutation.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation for GeoResponse.
 * - 1.1.0 (2026-09-19): Added QueryClientProvider.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			refetchOnWindowFocus: false
		}
	}
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</React.StrictMode>
);
