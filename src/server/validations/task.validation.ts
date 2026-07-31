import { z } from "zod";

// Transformador de frontera:
// Input (Red): string ISO | Output (Drizzle): Date
const isoDateTransform = z.iso
	.datetime()
	.nullable()
	.optional()
	.transform((val) => (val ? new Date(val) : val));

// 1. Validador para CREAR una tarea
export const createTaskValidator = z.object({
	title: z.string().min(1, "El título no puede estar vacío").max(255),
	deadline: isoDateTransform,
});

// 2. Validador para ACTUALIZAR una tarea
export const updateTaskValidator = z.object({
	title: z.string().min(1).max(255).optional(),
	status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
	deadline: isoDateTransform,
});

export const taskIdParamValidator = z.object({
	id: z.string().min(1, "El ID de la tarea es requerido y no puede estar vacío"),
});
