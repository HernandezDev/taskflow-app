import { z } from "zod";

// 1. Validador para CREAR una tarea
export const createTaskValidator = z.object({
	title: z.string().min(1, "El título no puede estar vacío").max(255),
	deadline: z.number().int().positive().optional(),
});

// 2. Validador para ACTUALIZAR una tarea
export const updateTaskValidator = z.object({
	title: z.string().min(1).max(255).optional(),
	status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
	deadline: z.number().int().positive().optional(),
});
