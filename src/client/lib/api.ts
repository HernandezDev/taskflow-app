import { hc } from "hono/client";
import type { AppType } from "../../server/index.ts";

// Exportamos el cliente RPC tipado como una única instancia para toda la SPA.
export const rpc = hc<AppType>("/");
