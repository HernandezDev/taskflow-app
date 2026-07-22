import { TrashIcon } from "@phosphor-icons/react";
import { useSignal } from "@preact/signals";
import { deleteTask, type Task, updateTask } from "../../stores/tasksStore"; // <- CORREGIDO: Importamos desde el store
import { Editable } from "../ui/Editable";
import { type TaskStatus, TaskStatusControl } from "../ui/TaskStatusControl";

interface TaskItemProps {
    task: Task;
}

export function TaskItem({ task }: TaskItemProps) {
    const isDeleting = useSignal(false);

    const handleDelete = async () => {
        if (!confirm("¿Eliminar esta tarea de forma permanente?")) return;
        
        isDeleting.value = true;
        const success = await deleteTask(task.id);
        
        if (!success) {
            isDeleting.value = false;
            alert("Error al eliminar la tarea. Intenta nuevamente.");
        }
    };

    const handleTitleCommit = async (newTitle: string): Promise<boolean> => {
    const trimmedTitle = newTitle.trim();
    
    // Vía de escape 1: Si es igual al original o está vacío, no consideramos que la red haya fallado.
    // Retornamos 'true' para indicar al hook que NO debe hacer rollback visual, 
    // simplemente debe cerrar el modo de edición silenciosamente.
    if (trimmedTitle === task.title || trimmedTitle === "") {
        return true; 
    }

    // Vía de ejecución 2: updateTask ya retorna un Promise<boolean> desde tasksStore.ts.
    // Lo retornamos directamente para que el hook procese el éxito o el fallo real de Cloudflare D1.
    return await updateTask(task.id, { title: trimmedTitle });
};

    return (
        <div 
            class={`
                group flex flex-col sm:flex-row sm:items-center gap-4 p-4 
                bg-white border border-gray-200 rounded-lg shadow-sm 
                transition-all
                ${isDeleting.value ? 'opacity-50 pointer-events-none' : 'hover:shadow-md'}
            `}
        >
            <div class="shrink-0">
                <TaskStatusControl 
                    taskId={task.id} 
                    currentStatus={task.status as TaskStatus} 
                />
            </div>

            <div class="flex-1 min-w-0">
                <Editable 
                    value={task.title} 
                    onCommit={handleTitleCommit} 
                    disabled={isDeleting.value}
                />
                
                {task.deadline && (
                    <span class="text-xs text-gray-400 mt-1 block">
                        Vence: {new Date(task.deadline).toLocaleDateString()}
                    </span>
                )}
            </div>

            <div class="shrink-0">
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting.value}
                    class="
                        p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 
                        rounded-md transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    aria-label="Eliminar tarea"
                >
                    <TrashIcon weight="bold" size={18} />
                </button>
            </div>
        </div>
    );
}