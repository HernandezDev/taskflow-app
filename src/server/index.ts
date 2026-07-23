import { Hono } from "hono";
import { cors } from "hono/cors";
import { getAuth } from "./infra";
import { tasksRouter } from "./routes/tasks.router";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

// 1. 🛡️ RUTA CRÍTICA ADELANTADA: Auth se procesa antes de cualquier CORS o parseo de stream.
// Se mantiene tu instanciación dinámica basada en Origin y URL.
app.on(["GET", "POST"], "/api/auth/*", (c) => {
	try {
		const auth = getAuth(c.env, c.req.url, c.req.header("Origin"));
		return auth.handler(c.req.raw);
	} catch (_e) {
		return c.json({ error: "No autorizado" }, 403);
	}
});

// 2. CORS: Defensa de perímetro para el resto de la API
app.use(
	"/*",
	cors({
		origin: (origin) => origin,
		credentials: true,
	}),
);

// 3. API - Sub-enrutador encadenable
const apiRoutes = new Hono<AppEnv>()
	.get("/health", (c) => c.json({ status: "ok" }))
	.route("/tasks", tasksRouter);

// Montamos la API y exportamos el tipo para el RPC tipado
const routes = app.route("/api", apiRoutes);

// 4. ORQUESTACIÓN - Frontend estático
if (!import.meta.env.DEV) {
	app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));
}

export type AppType = typeof routes;
export default app;
