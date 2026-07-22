import type { AppType } from "@server/index";
import { hc } from "hono/client";

// Exportamos el cliente RPC inyectando la orden estricta de enviar cookies
export const rpc = hc<AppType>("/", {
	fetch: (input: RequestInfo | URL, requestInit?: RequestInit) => {
		return fetch(input, {
			...requestInit,
			credentials: "include", // Directiva crítica para autenticación por cookies
		});
	},
});
