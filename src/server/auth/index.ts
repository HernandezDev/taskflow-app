import type { D1Database } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db";

export const createAuth = (config: { database: D1Database; secret: string; baseURL: string }) => {
	// Usamos el esquema que ya definiste en tu proyecto
	const db = drizzle(config.database, { schema });

	return betterAuth({
		baseURL: config.baseURL,
		secret: config.secret,
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema,
		}),
		advanced: {
			ipAddress: { ipAddressHeaders: ["CF-Connecting-IP"] },
		},
		emailAndPassword: {
			enabled: true,
		},
	});
};

export type AuthType = ReturnType<typeof createAuth>;
