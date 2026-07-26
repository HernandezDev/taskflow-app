import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { task } from "../db";
import { sessionMiddleware } from "../middlewares/session";
import type { AppEnv } from "../types";
import {
	createTaskValidator,
	taskIdParamValidator,
	updateTaskValidator,
} from "../validations/task.validation";

export const tasksRouter = new Hono<AppEnv>()
	.use("*", sessionMiddleware)

	.get("/", async (c) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ success: false, error: "No autorizado" }, 401);
		}
		const db = c.get("db");
		const userTasks = await db.select().from(task).where(eq(task.userId, user.id));

		return c.json({ success: true, data: userTasks });
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

		return c.json({ success: true, data: deletedTask });
	});
