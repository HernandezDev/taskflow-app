import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import type { AuthType } from "./auth";
import { createAuth } from "./auth";
import * as schema from "./db";
import type { Bindings } from "./types";

// 🛡️ Tipado explícito inyectando el esquema local
let _db: DrizzleD1Database<typeof schema> | null = null;
let _auth: AuthType | null = null;

export const getDb = (env: Bindings) => {
	if (!_db) {
		_db = drizzle(env.DB, { schema });
	}
	return _db;
};

/**
 * Patrón Singleton Atómico para Cloudflare Workers.
 * Se inicializa una sola vez por Isolate y deriva la URL base de forma reactiva
 * a partir del request actual para adaptarse a Producción, Previews o Local.
 */
export const getAuth = (env: Bindings, request: Request): AuthType => {
	if (!_auth) {
		const url = new URL(request.url);
		const currentBaseURL = `${url.protocol}//${url.host}`;

		_auth = createAuth({
			database: env.DB,
			secret: env.BETTER_AUTH_SECRET,
			baseURL: currentBaseURL,
		});
	}
	return _auth;
};
