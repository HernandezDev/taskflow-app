import { drizzle } from "drizzle-orm/d1";
import type { AuthType } from "./auth";
import { createAuth } from "./auth";
import * as schema from "./db";
import type { Bindings } from "./types";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
// El Map mágico para soportar ramas de Cloudflare
const authCache = new Map<string, AuthType>();

export const getDb = (env: Bindings) => {
	if (!_db) {
		_db = drizzle(env.DB, { schema });
	}
	return _db;
};

// Pasamos la URL actual y el Header Origin
export const getAuth = (env: Bindings, reqUrl: string, originHeader?: string): AuthType => {
	// 1. Fallback inteligente: GET directo a veces no tiene Origin, usamos la URL actual
	const currentOrigin = new URL(reqUrl).origin;
	const requestOrigin = (originHeader || currentOrigin).replace(/\/$/, "").toLowerCase();

	// 2. Validación de orígenes (Early Validation)
	const isLocal = requestOrigin.startsWith("http://localhost:");
	const isSameOrigin = requestOrigin === currentOrigin;

	let isPreviewOrProd = false;
	if (env.FRONTEND_URL) {
		const prodUrl = new URL(env.FRONTEND_URL);
		const prodHost = prodUrl.hostname.toLowerCase();
		isPreviewOrProd =
			requestOrigin === prodUrl.origin.toLowerCase() || requestOrigin.endsWith(`.${prodHost}`); // Permite *.hono-spa-spike.pages.dev
	}

	// Defensa de perímetro
	if (!isLocal && !isSameOrigin && !isPreviewOrProd) {
		console.error(`[Auth] Bloqueo temprano: Origen ${requestOrigin} no autorizado.`);
		throw new Error("403 Forbidden: Origen no autorizado");
	}

	// 3. Inicialización Perezosa Cacheada
	if (!authCache.has(requestOrigin)) {
		authCache.set(
			requestOrigin,
			createAuth({
				database: env.DB,
				secret: env.BETTER_AUTH_SECRET,
				baseURL: requestOrigin, // El origen validado y dinámico
			}),
		);
	}

	const instance = authCache.get(requestOrigin);
	if (!instance) {
		throw new Error(`Instancia de Auth falló al guardarse para: ${requestOrigin}`);
	}

	return instance;
};
