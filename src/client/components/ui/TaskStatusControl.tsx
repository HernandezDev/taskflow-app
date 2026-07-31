import { useSignal } from "@preact/signals";
import { normalizeProps, useMachine } from "@zag-js/preact";
import * as radio from "@zag-js/radio-group";
import { useId } from "preact/hooks";
import type { UpdateTaskInput } from "../../models/TaskModel";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

interface TaskStatusControlProps {
    taskId: string;
    currentStatus: TaskStatus;
    onUpdate: (id: string, updates: Pick<UpdateTaskInput, "status">) => Promise<boolean>;
}

const STATUS_OPTIONS: { label: string; value: TaskStatus }[] = [
    { label: "Pendiente", value: "PENDING" },
    { label: "Haciendo", value: "IN_PROGRESS" },
    { label: "Hecha", value: "COMPLETED" },
];

export function TaskStatusControl({ taskId, currentStatus, onUpdate }: TaskStatusControlProps) {
    // Estas dos son genuinamente locales: no representan una copia de un valor
    // externo, solo el estado transitorio de "hay una petición en curso ahora mismo".
    const isSaving = useSignal(false);
    const errorMsg = useSignal<string | null>(null);

    const handleChange = async (newStatus: TaskStatus) => {
        isSaving.value = true;
        errorMsg.value = null;

        const success = await onUpdate(taskId, { status: newStatus });

        if (!success) {
            errorMsg.value = "Error de red. Cambios revertidos.";
        }
        isSaving.value = false;
    };

    const service = useMachine(radio.machine, {
        id: useId(),
        value: currentStatus, // fuente única: el modelo, no una copia local
        orientation: "horizontal",
        disabled: isSaving.value,
        onValueChange: (details) => handleChange(details.value as TaskStatus),
    });

    const api = radio.connect(service, normalizeProps);

    return (
        <div class="flex flex-col gap-1 w-full max-w-sm">
            <div {...api.getRootProps()} class="flex items-center gap-1 bg-gray-100 p-1 rounded-md border border-gray-200 w-full">
                {STATUS_OPTIONS.map((opt) => (
                    <label
                        key={opt.value}
                        {...api.getItemProps({ value: opt.value })}
                        class="flex-1 text-center cursor-pointer px-3 py-1 text-xs font-medium rounded transition-all select-none zag-checked:bg-white zag-checked:text-blue-600 zag-checked:shadow-sm zag-disabled:opacity-40 zag-disabled:cursor-not-allowed hover:not([data-disabled]):bg-gray-200 text-gray-500"
                    >
                        <span {...api.getItemTextProps({ value: opt.value })}>{opt.label}</span>
                        <input {...api.getItemHiddenInputProps({ value: opt.value })} />
                    </label>
                ))}
            </div>
            {errorMsg.value && <span class="text-xs text-red-500 font-medium pl-1">{errorMsg.value}</span>}
        </div>
    );
}