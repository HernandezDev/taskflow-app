import { Hono } from "hono";
import { cors } from "hono/cors";
import { getAuth } from "./infra";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

// 1. CORS: Defensa de perímetro
app.use(
	"/*",
	cors({
		origin: (origin) => origin, // Ajusta a tu FRONTEND_URL en producción
		credentials: true,
	}),
);

// 2. Auth Route: Solo se inicializa si alguien llama a /api/auth
app.on(["GET", "POST"], "/api/auth/*", (c) => {
	// Pasamos c.req.url para que el Singleton sepa dónde está corriendo
	const auth = getAuth(c.env, c.req.url);
	return auth.handler(c.req.raw);
});

// 3. API - Sub-enrutador encadenable
const apiRoutes = new Hono<AppEnv>()
	.get("/health", (c) => c.json({ status: "ok" }))
	.get("/hint", (c) => c.json({ message: "¡Arquitectura Lazy-Singleton activa! ⚡" }));

// Montamos la API y exportamos el tipo para el RPC tipado
const routes = app.route("/api", apiRoutes);

// 4. ORQUESTACIÓN - Frontend estático
if (!import.meta.env.DEV) {
	app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));
}

export type AppType = typeof routes;
export default app;
