import type { D1Database } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db";

// 1. FÁBRICA DE PRODUCCIÓN (Se inyecta en Hono por petición)
export const createAuth = (db_binding: D1Database, baseURL?: string, secret?: string) => {
	const db = drizzle(db_binding);

	return betterAuth({
		baseURL,
		secret,
		database: drizzleAdapter(db, { provider: "sqlite", schema }),
		advanced: {
			ipAddress: { ipAddressHeaders: ["CF-Connecting-IP"] },
		},
		emailAndPassword: {
			enabled: true,
		},
	});
};

export type AuthType = ReturnType<typeof createAuth>;
