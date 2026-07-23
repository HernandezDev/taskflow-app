import { effect } from "@preact/signals-core";
import type { InferRequestType, InferResponseType } from "hono/client";
import { rpc } from "../lib/api";
import { createRpcModel } from "../lib/createRpcModel";
import { authStore } from "./authStore"; // 1. INYECCIÓN DE DEPENDENCIA

// 1. INFERENCIA DE TIPOS
type TasksResponse = InferResponseType<typeof rpc.api.tasks.$get, 200>;
export type Task = TasksResponse extends { data: (infer U)[] } ? U : never;
type UpdateTaskInput = InferRequestType<(typeof rpc.api.tasks)[":id"]["$patch"]>["json"];

const LOCAL_STORAGE_KEY = "taskflow_offline_tasks";

const getInitialOfflineData = (): Task[] => {
	if (typeof window === "undefined") {
		return [];
	}

	try {
		const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
		if (!cached) {
			return [];
		}

		const parsed = JSON.parse(cached);
		return Array.isArray(parsed) ? (parsed as Task[]) : [];
	} catch {
		return [];
	}
};

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

// 3. INSTANCIA DEL CEREBRO GLOBAL
export const tasksStore = createRpcModel<Task[]>(fetchTasksFn, getInitialOfflineData());

// --- NUEVO: BARRERA DE ORQUESTACIÓN DETERMINISTA ---
effect(() => {
	const isInit = authStore.isInitializing.value;
	const isAuth = authStore.isAuthenticated.value;

	// Solo dispara la mutación de red si la sesión finalizó su carga y el token es válido
	if (!isInit && isAuth) {
		tasksStore.execute();
	}
});
// ---------------------------------------------------

// Sincronización offline
effect(() => {
	if (typeof window === "undefined") {
		return;
	}

	try {
		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasksStore.data.value));
	} catch (err) {
		console.error("[tasksStore] localStorage sync failed:", err);
	}
});

// 4. ACCIONES MUTABLES
export const addTask = async (title: string, deadline?: number) => {
	try {
		const res = await rpc.api.tasks.$post({
			json: { title, deadline },
		});

		if (!res.ok) {
			throw new Error("Error al crear la tarea");
		}

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
			param: { id },
			json: updates,
		});

		if (!res.ok) {
			throw new Error("Error al actualizar la tarea");
		}

		const json = await res.json();

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
