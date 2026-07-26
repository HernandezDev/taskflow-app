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
	// 🛡️ Middleware perimetral: Valida la sesión una sola vez para todo el router de tareas
	.use("*", async (c, next) => {
		const auth = getAuth(c.env, c.req.raw);
		const session = await auth.api.getSession({ headers: c.req.raw.headers });

		if (!session?.user) {
			return c.json({ success: false, error: "No autorizado" }, 401);
		}

		// Inyectamos el usuario en el contexto de Hono de forma segura
		c.set("user", session.user);
		await next();
	})

	.get("/", async (c) => {
		const user = c.get("user");
		const db = getDb(c.env);
		const userTasks = await db.select().from(task).where(eq(task.userId, user.id));

		return c.json({ success: true, data: userTasks });
	})

	.post("/", zValidator("json", createTaskValidator), async (c) => {
		const user = c.get("user");
		const body = c.req.valid("json");
		const db = getDb(c.env);

		const [newTask] = await db
			.insert(task)
			.values({
				userId: user.id,
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
			const user = c.get("user");
			const { id: taskId } = c.req.valid("param");
			const body = c.req.valid("json");
			const db = getDb(c.env);

			const [updatedTask] = await db
				.update(task)
				.set({
					title: body.title,
					status: body.status,
					deadline:
						body.deadline === undefined
							? undefined
							: body.deadline === null
								? null
								: new Date(body.deadline),
				})
				.where(and(eq(task.id, taskId), eq(task.userId, user.id)))
				.returning();

			if (!updatedTask) {
				return c.json({ success: false, error: "Tarea no encontrada o sin permisos" }, 404);
			}

			return c.json({ success: true, data: updatedTask });
		},
	)

	.delete("/:id", zValidator("param", taskIdParamValidator), async (c) => {
		const user = c.get("user");
		const { id: taskId } = c.req.valid("param");
		const db = getDb(c.env);

		const [deletedTask] = await db
			.delete(task)
			.where(and(eq(task.id, taskId), eq(task.userId, user.id)))
			.returning();

		if (!deletedTask) {
			return c.json({ success: false, error: "Tarea no encontrada o sin permisos" }, 404);
		}

		return c.json({ success: true, data: deletedTask });
	});
