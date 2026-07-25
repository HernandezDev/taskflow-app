import { TrashIcon } from "@phosphor-icons/react";
import { useSignal } from "@preact/signals";
import type { Task, UpdateTaskInput } from "../../models/TaskModel";
import { Editable } from "../ui/Editable";
import { type TaskStatus, TaskStatusControl } from "../ui/TaskStatusControl";

interface TaskItemProps {
    task: Task;
    onUpdate: (id: string, updates: UpdateTaskInput) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
    const isDeleting = useSignal(false);

    const handleDelete = async () => {
        if (!confirm("¿Eliminar esta tarea de forma permanente?")) return;

        isDeleting.value = true;
        const success = await onDelete(task.id);

        if (!success) {
            isDeleting.value = false;
            alert("Error al eliminar la tarea. Intenta nuevamente.");
        }
    };

    const handleTitleCommit = async (newTitle: string): Promise<boolean> => {
        const trimmedTitle = newTitle.trim();

        if (trimmedTitle === task.title || trimmedTitle === "") {
            return true;
        }

        return await onUpdate(task.id, { title: trimmedTitle });
    };

    return (
        <div
            class={`
                group flex flex-col sm:flex-row sm:items-center gap-4 p-4 
                bg-white border border-gray-200 rounded-lg shadow-sm 
                transition-all
                ${isDeleting.value ? "opacity-50 pointer-events-none" : "hover:shadow-md"}
            `}
        >
            <div class="shrink-0">
                <TaskStatusControl
                    taskId={task.id}
                    currentStatus={task.status as TaskStatus}
                    onUpdate={onUpdate}
                />
            </div>

            <div class="flex-1 min-w-0">
                <Editable value={task.title} onCommit={handleTitleCommit} disabled={isDeleting.value} />

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