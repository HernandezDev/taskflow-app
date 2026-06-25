import { Hono } from "hono";

const app = new Hono<{ Bindings: { ASSETS: Fetcher } }>();

// 1. API - Creamos un sub-enrutador exclusivo y encadenable
const apiRoutes = new Hono()
	.get("/health", (c) => c.json({ status: "ok" }))
	.get("/hint", (c) =>
		c.json({
			message: "¡No olvides aprovechar las Signals y el RPC tipado! ⚡",
		}),
	);

// Montamos la API en /api y guardamos la referencia para el compilador
const routes = app.route("/api", apiRoutes);

// 2. ORQUESTACIÓN - Frontend estático servido desde el Edge en Producción
if (!import.meta.env.DEV) {
	app.all("*", (c) => {
		if (c.env?.ASSETS) {
			return c.env.ASSETS.fetch(c.req.raw);
		}
		return c.notFound();
	});
}

export type AppType = typeof routes;

export default app;
