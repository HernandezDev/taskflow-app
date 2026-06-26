import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

// 2. INSTANCIA FANTASMA (Aislada solo para comandos de terminal)
export const auth = betterAuth({
	// biome-ignore lint/suspicious/noExplicitAny: Inyección falsa requerida por la CLI al no tener D1 local
	database: drizzleAdapter({} as any, { provider: "sqlite" }),
});
