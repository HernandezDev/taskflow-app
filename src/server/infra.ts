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

// Cache de instancias por baseURL (no singleton único, evita el bug de
// baseURL congelado). Riesgo aceptado: si se activa advanced.backgroundTasks,
// revisar esto — hoy está desactivado, no aplica colisión de tareas en segundo plano.
const authInstances = new Map<string, AuthType>();

export const getAuth = (env: Bindings, request: Request): AuthType => {
	const url = new URL(request.url);
	const baseURL = `${url.protocol}//${url.host}`;

	let auth = authInstances.get(baseURL);
	if (!auth) {
		auth = createAuth({
			database: env.DB,
			secret: env.BETTER_AUTH_SECRET,
			baseURL,
		});
		authInstances.set(baseURL, auth);
	}
	return auth;
};
