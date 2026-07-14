import { z } from "zod";

// 1. Esquema para CREAR una tarea
export const createTaskSchema = z.object({
	// El título es obligatorio, igual que en tu base de datos ("not null")
	title: z
		.string()
		.min(1, "El título no puede estar vacío")
		.max(255, "El título es demasiado largo"),

	// El deadline es opcional, la DB lo permite.
	// Lo definimos como un número (timestamp) positivo.
	deadline: z.number().int().positive().optional(),

	// Nota: No pedimos el 'status' aquí porque tu BD ya le asigna 'PENDING' por defecto.
	// Tampoco pedimos 'user_id' porque eso lo sacaremos del token de sesión por seguridad, ¡nunca del frontend!
});

// 2. Esquema para ACTUALIZAR una tarea (ej. con tu componente <Editable>)
export const updateTaskSchema = z.object({
	title: z.string().min(1).max(255).optional(),

	// Aquí sí permitimos actualizar el estado
	status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),

	deadline: z.number().int().positive().optional(),
});
