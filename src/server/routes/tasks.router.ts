import { zValidator } from "@hono/zod-validator";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { task } from "../db";
import { sessionMiddleware } from "../middlewares/session";
import type { AppEnv } from "../types";
import {
	createTaskValidator,
	taskIdParamValidator,
	updateTaskValidator,
} from "../validations/task.validation";

// Función auxiliar de deshidratación para proteger el contrato RPC
const serializeTask = (t: typeof task.$inferSelect) => ({
	...t,
	deadline: t.deadline ? t.deadline.toISOString() : null,
	createdAt: t.createdAt.toISOString(),
	updatedAt: t.updatedAt.toISOString(),
});

export const tasksRouter = new Hono<AppEnv>()
	.use("*", sessionMiddleware)

	.get("/", async (c) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ success: false, error: "No autorizado" }, 401);
		}
		const db = c.get("db");

		// [DB-001] Ordenamiento semántico delegado a D1 (Limpio de imports muertos)
		const userTasks = await db
			.select()
			.from(task)
			.where(eq(task.userId, user.id))
			.orderBy(
				sql`CASE ${task.status} 
                    WHEN 'PENDING' THEN 1 
                    WHEN 'IN_PROGRESS' THEN 2 
                    WHEN 'COMPLETED' THEN 3 
                    ELSE 4 END ASC`,
				sql`${task.deadline} ASC NULLS LAST`,
			);

		return c.json({ success: true, data: userTasks.map(serializeTask) });
	})

	.post("/", zValidator("json", createTaskValidator), async (c) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ success: false, error: "No autorizado" }, 401);
		}
		const body = c.req.valid("json");
		const db = c.get("db");

		const [newTask] = await db
			.insert(task)
			.values({
				userId: user.id,
				title: body.title,
				deadline: body.deadline ?? undefined,
			})
			.returning();

		return c.json({ success: true, data: serializeTask(newTask) }, 201);
	})

	.patch(
		"/:id",
		zValidator("param", taskIdParamValidator),
		zValidator("json", updateTaskValidator),
		async (c) => {
			const user = c.get("user");
			if (!user) {
				return c.json({ success: false, error: "No autorizado" }, 401);
			}
			const { id: taskId } = c.req.valid("param");
			const body = c.req.valid("json");
			const db = c.get("db");

			const [updatedTask] = await db
				.update(task)
				.set({
					title: body.title,
					status: body.status,
					deadline: body.deadline,
				})
				.where(and(eq(task.id, taskId), eq(task.userId, user.id)))
				.returning();

			if (!updatedTask) {
				return c.json({ success: false, error: "Tarea no encontrada o sin permisos" }, 404);
			}

			return c.json({ success: true, data: serializeTask(updatedTask) });
		},
	)

	.delete("/:id", zValidator("param", taskIdParamValidator), async (c) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ success: false, error: "No autorizado" }, 401);
		}
		const { id: taskId } = c.req.valid("param");
		const db = c.get("db");

		const [deletedTask] = await db
			.delete(task)
			.where(and(eq(task.id, taskId), eq(task.userId, user.id)))
			.returning();

		if (!deletedTask) {
			return c.json({ success: false, error: "Tarea no encontrada o sin permisos" }, 404);
		}

		return c.json({ success: true, data: serializeTask(deletedTask) });
	});
