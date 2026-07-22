import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { task } from "../db";
import { getAuth, getDb } from "../infra";
import type { AppEnv } from "../types";
import {
	createTaskValidator,
	taskIdParamValidator,
	updateTaskValidator,
} from "../validations/task.validation";

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
	})
	.patch(
		"/:id",
		zValidator("param", taskIdParamValidator),
		zValidator("json", updateTaskValidator),
		async (c) => {
			const auth = getAuth(c.env, c.req.url, c.req.header("Origin"));
			const session = await auth.api.getSession({ headers: c.req.raw.headers });

			if (!session?.user) {
				return c.json({ success: false, error: "No autorizado" }, 401);
			}

			// Ya no usamos c.req.param("id"). Usamos el dato validado por Zod.
			const { id: taskId } = c.req.valid("param");
			const body = c.req.valid("json");
			const db = getDb(c.env);

			const [updatedTask] = await db
				.update(task)
				.set({
					title: body.title,
					status: body.status,
					deadline: body.deadline ? new Date(body.deadline) : undefined,
				})
				.where(and(eq(task.id, taskId), eq(task.userId, session.user.id)))
				.returning();

			if (!updatedTask) {
				return c.json({ success: false, error: "Tarea no encontrada o sin permisos" }, 404);
			}

			return c.json({ success: true, data: updatedTask });
		},
	)

	// --------------------------------------------------------
	// 4. DELETE /api/tasks/:id -> Eliminar tarea
	// --------------------------------------------------------
	.delete("/:id", zValidator("param", taskIdParamValidator), async (c) => {
		const auth = getAuth(c.env, c.req.url, c.req.header("Origin"));
		const session = await auth.api.getSession({ headers: c.req.raw.headers });

		if (!session?.user) {
			return c.json({ success: false, error: "No autorizado" }, 401);
		}

		// Extracción segura del ID
		const { id: taskId } = c.req.valid("param");
		const db = getDb(c.env);

		const [deletedTask] = await db
			.delete(task)
			.where(and(eq(task.id, taskId), eq(task.userId, session.user.id)))
			.returning();

		if (!deletedTask) {
			return c.json({ success: false, error: "Tarea no encontrada o sin permisos" }, 404);
		}

		return c.json({ success: true, data: deletedTask });
	});
