import { z } from "zod";

// 1. Validador para CREAR una tarea
export const createTaskValidator = z.object({
	title: z.string().min(1, "El título no puede estar vacío").max(255),
	// Usamos coerce.date para aceptar strings ISO o números y transformarlos en Date de forma segura
	deadline: z.coerce.date().nullable().optional(),
});

// 2. Validador para ACTUALIZAR una tarea
export const updateTaskValidator = z.object({
	title: z.string().min(1).max(255).optional(),
	status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
	deadline: z.coerce.date().nullable().optional(),
});

export const taskIdParamValidator = z.object({
	id: z.string().min(1, "El ID de la tarea es requerido y no puede estar vacío"),
});
