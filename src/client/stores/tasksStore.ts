import type { InferRequestType, InferResponseType } from "hono/client";
import { rpc } from "../lib/api";
import { createRpcModel } from "../lib/createRpcModel";

// 1. INFERENCIA DE TIPOS
type TasksResponse = InferResponseType<typeof rpc.api.tasks.$get, 200>;
export type Task = TasksResponse extends { data: (infer U)[] } ? U : never;
type UpdateTaskInput = InferRequestType<(typeof rpc.api.tasks)[":id"]["$patch"]>["json"];

// 2. FUNCIÓN DE FETCH
const fetchTasksFn = async (abortSignal: AbortSignal): Promise<Task[]> => {
	const res = await rpc.api.tasks.$get(undefined, {
		init: { signal: abortSignal },
	});

	// Si hubo un error 401 (No autorizado) u otro fallo HTTP, cortamos aquí
	if (!res.ok) {
		throw new Error("Error en la petición de tareas");
	}

	// TypeScript sabe que, llegados aquí, 'json' es estrictamente { success: true, data: Task[] }
	const json = await res.json();
	return json.data;
};

// 3. INSTANCIA DEL CEREBRO GLOBAL
export const tasksStore = createRpcModel<Task[]>(fetchTasksFn, []);

// 4. ACCIONES MUTABLES
export const addTask = async (title: string, deadline?: number) => {
	try {
		const res = await rpc.api.tasks.$post({
			json: { title, deadline },
		});

		if (!res.ok) {
			throw new Error("Error al crear la tarea");
		}

		// De nuevo, gracias a !res.ok, sabemos que la tarea se creó perfectamente
		const json = await res.json();

		tasksStore.mutate((prevTasks) => [...prevTasks, json.data]);
		return true;
	} catch (err) {
		console.error("[tasksStore] addTask:", err);
		return false;
	}
};

export const updateTask = async (id: string, updates: UpdateTaskInput) => {
	try {
		const res = await rpc.api.tasks[":id"].$patch({
			param: { id }, // Corregido: param (singular)
			json: updates, // Ahora tipado estrictamente por InferRequestType
		});

		if (!res.ok) {
			throw new Error("Error al actualizar la tarea");
		}

		const json = await res.json();

		// Actualizamos la señal reactiva
		tasksStore.mutate((prevTasks) => prevTasks.map((task) => (task.id === id ? json.data : task)));
		return true;
	} catch (err) {
		console.error("[tasksStore] updateTask:", err);
		return false;
	}
};

export const deleteTask = async (id: string) => {
	try {
		const res = await rpc.api.tasks[":id"].$delete({
			param: { id },
		});

		if (!res.ok) {
			throw new Error("Error al eliminar la tarea");
		}

		tasksStore.mutate((prevTasks) => prevTasks.filter((task) => task.id !== id));
		return true;
	} catch (err) {
		console.error("[tasksStore] deleteTask:", err);
		return false;
	}
};

// Puedes añadir fácilmente acciones como updateTask o deleteTask aquí mismo
// y seguir usando tasksStore.mutate() para actualizar la lista de forma optimista.
