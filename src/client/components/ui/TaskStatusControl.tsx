import { useModel } from "@preact/signals";
import { normalizeProps, useMachine } from "@zag-js/preact";
import * as radio from "@zag-js/radio-group";
import { useId } from "preact/hooks";
import { AsyncFieldMutatorModel } from "../../models/AsyncFieldMutatorModel";
import { updateTask } from "../../stores/tasksStore";

// Tipado alineado con tu schema de Drizzle/Zod
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

interface TaskStatusControlProps {
    taskId: string;
    currentStatus: TaskStatus;
}

// El orden en este array dicta la percepción visual del flujo Kanban
const STATUS_OPTIONS: { label: string; value: TaskStatus }[] = [
    { label: "Pendiente", value: "PENDING" },
    { label: "En Proceso", value: "IN_PROGRESS" },
    { label: "Finalizado", value: "COMPLETED" },
];

export function TaskStatusControl({ taskId, currentStatus }: TaskStatusControlProps) {
    // 1. Orquestador de Red (Invariable, sigue protegiendo contra errores 500)
    const model = useModel(() => new AsyncFieldMutatorModel<TaskStatus>(
        currentStatus,
        (newVal) => updateTask(taskId, { status: newVal })
    ));

    // 2. Máquina de Presentación (Zag.js)
    const service = useMachine(radio.machine, {
        id: useId(),
        value: model.fallbackValue.value,
        orientation: "horizontal",
        disabled: model.isSaving.value, // Bloqueo de infraestructura (Red), NO de dominio

        onValueChange: (details) => {
            model.commitChange(details.value as TaskStatus);
        },
    });

    const api = radio.connect(service, normalizeProps);

    return (
        <div class="flex flex-col gap-1 w-full max-w-sm">
            {/* Contenedor del Segmented Control */}
            <div
                {...api.getRootProps()}
                class="flex items-center gap-1 bg-gray-100 p-1 rounded-md border border-gray-200 w-full"
            >
                {STATUS_OPTIONS.map((opt) => (
                    <label
                        key={opt.value}
                        {...api.getItemProps({ value: opt.value })}
                        class="
                flex-1 text-center cursor-pointer px-3 py-1 text-xs font-medium rounded transition-all select-none
                data-[state=checked]:bg-white data-[state=checked]:text-blue-600 data-[state=checked]:shadow-sm
                data-disabled:opacity-40 data-disabled:cursor-not-allowed
                hover:not([data-disabled]):bg-gray-200 text-gray-500
                "
                    >
                        <span {...api.getItemTextProps({ value: opt.value })}>
                            {opt.label}
                        </span>
                        <input {...api.getItemHiddenInputProps({ value: opt.value })} />
                    </label>
                ))}
            </div>

            {/* Interceptor de Excepciones de Red */}
            {model.error.value && (
                <span class="text-xs text-red-500 font-medium pl-1">{model.error.value}</span>
            )}
        </div>
    );
}