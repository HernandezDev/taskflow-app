import { CheckIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useSignal } from "@preact/signals";
import type { Task, UpdateTaskInput } from "../../models/TaskModel";
import { DeadlineNativePicker } from "../ui/DeadlineNativePicker";
import { Editable } from "../ui/Editable";
import { type TaskStatus, TaskStatusControl } from "../ui/TaskStatusControl";

interface TaskItemProps {
    task: Task;
    onUpdate: (id: string, updates: UpdateTaskInput) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
    const isDeleting = useSignal(false);
    const isConfirming = useSignal(false);

    const handleExecuteDelete = async () => {
        isDeleting.value = true;
        isConfirming.value = false;

        const success = await onDelete(task.id);

        if (!success) {
            isDeleting.value = false;
            console.error("[TaskItem] Fallo crítico al eliminar la tarea en red.");
        }
    };

    const handleTitleCommit = async (newTitle: string): Promise<boolean> => {
        const trimmedTitle = newTitle.trim();

        if (trimmedTitle === task.title || trimmedTitle === "") {
            return true;
        }

        return await onUpdate(task.id, { title: trimmedTitle });
    };

    const handleDeadlineUpdate = async (id: string, deadline: string | null): Promise<boolean> => {
        return await onUpdate(id, { deadline });
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
                        Vence: {
                            new Intl.DateTimeFormat(navigator.language, { 
                                dateStyle: 'medium', 
                                timeStyle: 'short' 
                            }).format(new Date(task.deadline))
                        }
                    </span>
                )}
            </div>

            <div class="shrink-0 flex items-center gap-1">
                <DeadlineNativePicker
                    taskId={task.id}
                    currentDeadline={task.deadline || null}
                    onUpdate={handleDeadlineUpdate}
                />

                {/* Zona de borrado con Confirmación Inline (Evita bloqueos de window.confirm) */}
                {isConfirming.value ? (
                    <div class="flex items-center gap-1 bg-red-50 p-1 rounded-md border border-red-200">
                        <span class="text-[11px] text-red-700 font-medium px-1">¿Borrar?</span>
                        <button
                            type="button"
                            onClick={handleExecuteDelete}
                            class="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            aria-label="Confirmar eliminación"
                        >
                            <CheckIcon size={14} weight="bold" />
                        </button>
                        <button
                            type="button"
                            onClick={() => (isConfirming.value = false)}
                            class="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            aria-label="Cancelar eliminación"
                        >
                            <XIcon size={14} weight="bold" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => (isConfirming.value = true)}
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
                )}
            </div>
        </div>
    );
}