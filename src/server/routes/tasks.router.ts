import { Hono } from "hono";
import type { AppEnv } from "../types"; // Importa tu tipo de entorno si lo necesitas

// 1. Declaramos y encadenamos las rutas INMEDIATAMENTE
export const tasksRouter = new Hono<AppEnv>().get("/", (c) => {
	// Retornamos una respuesta básica para probar la conexión
	return c.json({
		success: true,
		data: [],
		message: "Endpoint de tareas activo",
	});
});

// Nota: Al usar export const, puedes importarlo en tu index.ts usando:
// import { tasksRouter } from "./routes/tasks.router";
