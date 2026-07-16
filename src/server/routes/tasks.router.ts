import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm"; // Solo necesitamos 'eq' por ahora
import { Hono } from "hono";
import { task } from "../db";
import { getAuth, getDb } from "../infra";
import type { AppEnv } from "../types";
import { createTaskValidator } from "../validations/task.validation";

export const tasksRouter = new Hono<AppEnv>()
	// --------------------------------------------------------
	// 1. GET /api/tasks -> Obtener todas las tareas del usuario
	// --------------------------------------------------------
	.get("/", async (c) => {
		const auth = getAuth(c.env, c.req.url, c.req.header("Origin"));
		const session = await auth.api.getSession({ headers: c.req.raw.headers });

		if (!session?.user) {
			return c.json({ success: false, error: "No autorizado" }, 401);
		}

		const db = getDb(c.env);
		const userTasks = await db.select().from(task).where(eq(task.userId, session.user.id));

		return c.json({ success: true, data: userTasks });
	})

	// --------------------------------------------------------
	// 2. POST /api/tasks -> Crear una nueva tarea
	// --------------------------------------------------------
	.post("/", zValidator("json", createTaskValidator), async (c) => {
		const auth = getAuth(c.env, c.req.url, c.req.header("Origin"));
		const session = await auth.api.getSession({ headers: c.req.raw.headers });

		if (!session?.user) {
			return c.json({ success: false, error: "No autorizado" }, 401);
		}

		const body = c.req.valid("json");
		const db = getDb(c.env);

		const [newTask] = await db
			.insert(task)
			.values({
				userId: session.user.id,
				title: body.title,
				deadline: body.deadline ? new Date(body.deadline) : undefined,
			})
			.returning();

		return c.json({ success: true, data: newTask }, 201);
	});
