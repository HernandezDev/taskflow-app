import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { getAuth, getDb } from "./infra";
import { tasksRouter } from "./routes/tasks.router";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

// 0. 📝 Logger: primero en la cadena, para registrar toda request entrante
app.use(logger());

// 1. 🛡️ RUTA CRÍTICA ADELANTADA: Auth se procesa antes de cualquier CORS o parseo de stream.
app.all("/api/auth/*", (c) => {
	try {
		const auth = getAuth(c.env, c.req.raw);
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

// 3. 🔧 Middleware de infraestructura: db y auth por request, disponibles en c.get(...)
//    para que ningún router necesite llamar getDb/getAuth a mano. auth se cachea
//    internamente por baseURL (ver infra.ts).
app.use("/api/*", async (c, next) => {
	c.set("db", getDb(c.env));
	c.set("auth", getAuth(c.env, c.req.raw));
	await next();
});

// 4. API - Sub-enrutador encadenable
const apiRoutes = new Hono<AppEnv>()
	.get("/health", (c) => c.json({ status: "ok" }))
	.route("/tasks", tasksRouter);

// Montamos la API y exportamos el tipo para el RPC tipado
const routes = app.route("/api", apiRoutes);

// 5. ORQUESTACIÓN - Frontend estático
if (!import.meta.env.DEV) {
	app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));
}

export type AppType = typeof routes;
export default app;
