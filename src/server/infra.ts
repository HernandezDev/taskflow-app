import { drizzle } from "drizzle-orm/d1";
import type { AuthType } from "./auth"; // 1. Importamos tu tipo exacto
import { createAuth } from "./auth";
import * as schema from "./db";
import type { Bindings } from "./types";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _auth: AuthType | null = null;

export const getDb = (env: Bindings) => {
	if (!_db) {
		_db = drizzle(env.DB, { schema });
	}
	return _db;
};

// 3. El compilador ahora sabe exactamente qué retorna getAuth
export const getAuth = (env: Bindings, currentUrl: string): AuthType => {
	if (!_auth) {
		// Extraemos el origen real donde se está ejecutando este Worker (ej: https://283838.taskflow.dev)
		const origin = new URL(currentUrl).origin;

		_auth = createAuth({
			database: env.DB,
			secret: env.BETTER_AUTH_SECRET,
			baseURL: origin,
		});
	}
	return _auth;
};
