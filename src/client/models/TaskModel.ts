import { createModel, effect } from "@preact/signals-core";
import type { InferRequestType, InferResponseType } from "hono/client";
import { rpc } from "../lib/api";
import { createRpcModel } from "../lib/createRpcModel";
import { offlineTasksStore } from "../stores/offlineTasksStore";

// 1. INFERENCIA DE TIPOS
type TasksResponse = InferResponseType<typeof rpc.api.tasks.$get, 200>;
export type Task = TasksResponse extends { data: (infer U)[] } ? U : never;
export type UpdateTaskInput = InferRequestType<(typeof rpc.api.tasks)[":id"]["$patch"]>["json"];

// 2. FUNCIÓN DE FETCH
const fetchTasksFn = async (abortSignal: AbortSignal): Promise<Task[]> => {
	const res = await rpc.api.tasks.$get(undefined, {
		init: { signal: abortSignal },
	});

	if (!res.ok) {
		throw new Error("Error en la petición de tareas");
	}

	const json = await res.json();
	return json.data;
};

// 3. MODELO EFÍMERO, ATADO AL CICLO DE VIDA DE LA PANTALLA (useModel)
export const TaskModel = createModel(() => {
	// El auto-fetch de createRpcModel dispara la petición apenas se crea esta instancia.
	// Requiere que quien monte este modelo (DashboardScreen) ya sepa que hay sesión activa.
	const resource = createRpcModel<Task[]>(fetchTasksFn, offlineTasksStore.getCached<Task>());

	// Sincronización offline: cada cambio en los datos se refleja en localStorage
	effect(() => {
		offlineTasksStore.setCached(resource.data.value);
	});

	// Disposal en cascada: el modelo interno (resource) tiene su propio ciclo de vida
	// y no se limpia solo cuando este modelo externo se destruye. Lo conectamos a mano.
	effect(() => {
		return () => {
			resource[Symbol.dispose]();
		};
	});

	// 4. ACCIONES MUTABLES
	const addTask = async (title: string, deadline?: string | null) => {
		try {
			const res = await rpc.api.tasks.$post({
				json: { title, deadline },
			});

			if (!res.ok) {
				throw new Error("Error al crear la tarea");
			}

			const json = await res.json();
			resource.mutate((prevTasks) => [...prevTasks, json.data]);
			return true;
		} catch (err) {
			console.error("[TaskModel] addTask:", err);
			return false;
		}
	};

	const updateTask = async (id: string, updates: UpdateTaskInput) => {
		const previous = resource.data.value;

		resource.mutate((prevTasks) =>
			prevTasks.map((task) => {
				if (task.id !== id) return task;

				return {
					...task,
					...updates,
					// Limpio de casters innecesarios (as string | number | Date)
					deadline: updates.deadline === undefined ? task.deadline : updates.deadline,
				};
			}),
		);

		try {
			const res = await rpc.api.tasks[":id"].$patch({
				param: { id },
				json: updates,
			});

			if (!res.ok) {
				throw new Error("Error al actualizar la tarea");
			}

			const json = await res.json();
			resource.mutate((prevTasks) => prevTasks.map((task) => (task.id === id ? json.data : task)));
			return true;
		} catch (err) {
			console.error("[TaskModel] updateTask:", err);
			resource.mutate(() => previous);
			return false;
		}
	};

	const deleteTask = async (id: string) => {
		const previous = resource.data.value;

		// 1. Aplicación optimista inmediata: filtramos la tarea de la UI sin esperar la red
		resource.mutate((prevTasks) => prevTasks.filter((task) => task.id !== id));

		try {
			const res = await rpc.api.tasks[":id"].$delete({
				param: { id },
			});

			if (!res.ok) {
				throw new Error("Error al eliminar la tarea en el servidor");
			}

			return true;
		} catch (err) {
			console.error("[TaskModel] deleteTask:", err);

			// 2. Rollback de red: si falla, restauramos el snapshot previo
			resource.mutate(() => previous);
			return false;
		}
	};

	return {
		data: resource.data,
		isLoading: resource.isLoading,
		error: resource.error,
		execute: resource.execute,
		addTask,
		updateTask,
		deleteTask,
	};
});
