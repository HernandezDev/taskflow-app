import { UserIcon } from "@phosphor-icons/react";
import { useModel } from "@preact/signals";
import { TaskItem } from "../components/tasks/TaskItem";
import { TaskQuickAdd } from "../components/tasks/TaskQuickAdd";
import { useTransitionRoute } from "../hooks/useTransitionRoute";
import { TaskModel } from "../models/TaskModel";
import { authStore } from "../stores/authStore";

export function DashboardScreen() {
    const route = useTransitionRoute();

    // Extraemos el usuario actual del store global
    const user = authStore.user.value;
    const displayName = user?.name ?? user?.email ?? "Usuario";

    const handleLogout = async () => {
        await authStore.logout();
        route("/", { replace: true, direction: "backward" });
    };

    // Instancia efímera: se crea al montar Dashboard, se destruye (junto al
    // fetch en vuelo) al desmontar. Ya no es un singleton global.
    const taskModel = useModel(TaskModel);
    const { data: tasks, isLoading, error } = taskModel;

    const sortedTasks = [...tasks.value].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return (
        <div class="max-w-3xl mx-auto p-4 sm:p-6 w-full flex flex-col gap-6">
            <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="flex flex-col gap-2">
                    <h1 class="text-2xl font-bold text-gray-900">Workspace</h1>
                    <p class="text-sm text-gray-500">
                        Captura y organiza tu flujo de trabajo.
                    </p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="inline-flex items-center gap-2 text-sm text-gray-600">
                        <UserIcon size={32} />
                        <span class="max-w-45 truncate font-medium text-gray-700">{displayName}</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={authStore.isPending.value}
                        class="inline-flex h-9 items-center justify-center rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {authStore.isPending.value ? "Saliendo..." : "Cerrar sesión"}
                    </button>
                </div>
            </header>

            <main class="flex flex-col gap-6">
                <TaskQuickAdd onAdd={taskModel.addTask} />

                {error.value && (
                    <div class="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
                        {error.value.message || "Fallo crítico al sincronizar tareas."}
                    </div>
                )}

                <section class="flex flex-col gap-3">
                    {sortedTasks.length === 0 && !isLoading.value ? (
                        <div class="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
                            No hay tareas pendientes. Presiona Enter arriba para comenzar.
                        </div>
                    ) : (
                        sortedTasks.map((task) => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                onUpdate={taskModel.updateTask}
                                onDelete={taskModel.deleteTask}
                            />
                        ))
                    )}
                </section>

                {isLoading.value && sortedTasks.length > 0 && (
                    <div class="text-xs text-gray-400 flex justify-center animate-pulse">
                        Sincronizando con el servidor...
                    </div>
                )}
            </main>
        </div>
    );
}