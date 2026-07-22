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

    const handleTitleCommit = async (newTitle: string) => {
        if (newTitle === task.title || newTitle.trim() === "") return;
        await updateTask(task.id, { title: newTitle.trim() });
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