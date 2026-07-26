import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import type { AuthType } from "./auth";
import { createAuth } from "./auth";
import * as schema from "./db";
import type { Bindings } from "./types";

// 🛡️ Tipado explícito inyectando el esquema local
let _db: DrizzleD1Database<typeof schema> | null = null;

export const getDb = (env: Bindings) => {
	if (!_db) {
		_db = drizzle(env.DB, { schema });
	}
	return _db;
};

/**
 * Instancia de auth por request — no se cachea a nivel de módulo.
 *
 * Motivos:
 * 1. baseURL se recalcula fresco en cada request a partir de la URL real,
 *    en vez de quedar congelado con el primer request que "calienta" el Isolate.
 * 2. Sin caché, no hay riesgo de que dos requests concurrentes comparariacomparten
 *    una instancia si en algún momento se habilita advanced.backgroundTasks
 *    (hoy desactivado).
 */
export const createRequestAuth = (env: Bindings, request: Request): AuthType => {
	const url = new URL(request.url);
	const currentBaseURL = `${url.protocol}//${url.host}`;

	return createAuth({
		database: env.DB,
		secret: env.BETTER_AUTH_SECRET,
		baseURL: currentBaseURL,
	});
};
