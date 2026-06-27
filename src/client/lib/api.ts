import type { AppType } from "@server/index";
import { hc } from "hono/client";

// Exportamos el cliente RPC tipado como una única instancia para toda la SPA.
export const rpc = hc<AppType>("/");
