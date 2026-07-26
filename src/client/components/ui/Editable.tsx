import { CircleNotchIcon } from "@phosphor-icons/react";
import { useSignal } from "@preact/signals";
import * as editable from "@zag-js/editable";
import { normalizeProps, useMachine } from "@zag-js/preact";
import { useId } from "preact/hooks";

interface EditableProps {
    value: string;
    onCommit: (value: string) => Promise<boolean>;
    placeholder?: string;
    disabled?: boolean;
}

export function Editable({ value, onCommit, placeholder = "Editar...", disabled = false }: EditableProps) {
    const isSaving = useSignal(false);
    const errorMsg = useSignal<string | null>(null);

    const handleCommit = async (newValue: string) => {
        isSaving.value = true;
        errorMsg.value = null;

        const success = await onCommit(newValue);

        if (!success) {
            errorMsg.value = "Error de red. Cambios revertidos.";
        }
        isSaving.value = false;
    };

    const service = useMachine(editable.machine, {
        id: useId(),
        value, // fuente única: el prop, que ya viene del modelo
        disabled: disabled || isSaving.value,
        submitMode: "both",
        activationMode: "click",
        autoResize: true,
        onValueCommit: (details) => handleCommit(details.value),
    });

    const api = editable.connect(service, normalizeProps);

    return (
        <div {...api.getRootProps()} class="group flex flex-col gap-1 w-full">
            <div {...api.getAreaProps()} class="relative w-full">
                <input
                    {...api.getInputProps()}
                    class="w-full bg-white outline-none ring-2 ring-blue-500 rounded py-1 pl-2 pr-8 text-gray-900 shadow-sm transition-all zag-disabled:opacity-50 zag-disabled:cursor-not-allowed"
                />
                <span
                    {...api.getPreviewProps()}
                    class="block cursor-text py-1 pl-2 pr-8 rounded transition-colors text-gray-800 hover:bg-gray-100 group-zag-disabled:opacity-50 group-zag-disabled:cursor-not-allowed group-zag-disabled:pointer-events-none truncate"
                >
                    {api.value || placeholder}
                </span>
                {isSaving.value && (
                    <div class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                        <CircleNotchIcon size={16} class="animate-spin" weight="bold" />
                    </div>
                )}
            </div>
            {errorMsg.value && <span class="text-xs text-red-500 font-medium pl-1">{errorMsg.value}</span>}
        </div>
    );
}