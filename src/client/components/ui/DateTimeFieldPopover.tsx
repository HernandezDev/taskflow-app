import { CalendarDotsIcon, TrashIcon } from "@phosphor-icons/react";
import { useSignal,useSignalEffect } from "@preact/signals";

interface DateTimeFieldPopoverProps {
    id: string;
    value: string | null;
    onUpdate: (id: string, value: string | null) => Promise<boolean>;
}

export function DateTimeFieldPopover({ id, value, onUpdate }: DateTimeFieldPopoverProps) {
    const isOpen = useSignal(false);

    const getInitialDate = (iso: string | null): string => {
        if (!iso) return "";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";

        return new Intl.DateTimeFormat("en-CA", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(d);
    };

    const getInitialTime = (iso: string | null) => {
        if (!iso) return "";
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? "" : d.toTimeString().slice(0, 5);
    };

    const dateVal = useSignal(getInitialDate(value));
    const timeVal = useSignal(getInitialTime(value));
    const isSubmitting = useSignal(false);

useSignalEffect(() => {
    if (!isOpen.value) return;

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            isOpen.value = false;
        }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
})

    const handleSave = async () => {
        isSubmitting.value = true;
        let finalIso: string | null = null;

        if (dateVal.value) {
            const time = timeVal.value || "00:00";
            finalIso = new Date(`${dateVal.value}T${time}:00`).toISOString();
        }

        const success = await onUpdate(id, finalIso);
        isSubmitting.value = false;
        if (success) {
            isOpen.value = false;
        }
    };

    const handleClear = async () => {
        dateVal.value = "";
        timeVal.value = "";
        isSubmitting.value = true;
        await onUpdate(id, null);
        isSubmitting.value = false;
        isOpen.value = false;
    };

    return (
        <div class="relative inline-block text-left">
            <button
                type="button"
                onClick={() => (isOpen.value = !isOpen.value)}
                class="p-2 min-w-11 min-h-11 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Gestionar fecha límite"
            >
                <CalendarDotsIcon size={18} weight={value ? "fill" : "regular"} />
            </button>

            {isOpen.value && (
                <>
                    <div class="fixed inset-0 bg-black/20 z-40" aria-hidden="true" onClick={() => (isOpen.value = false)} />
                    <div
                        class="
                            fixed inset-x-4 bottom-4 z-50
                            sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:mt-2 sm:w-72
                            bg-white border border-gray-200 rounded-lg shadow-xl p-4
                            flex flex-col gap-3
                        "
                    >
                        <div class="text-xs font-semibold text-gray-700">Configurar vencimiento</div>

                        <div class="flex flex-col gap-1">
                            <label htmlFor={`date-input-${id}`} class="text-[11px] text-gray-400">
                                Fecha
                            </label>
                            <input
                                id={`date-input-${id}`}
                                type="date"
                                value={dateVal.value}
                                onInput={(e) => (dateVal.value = e.currentTarget.value)}
                                class="text-xs border border-gray-200 rounded px-2 py-1.5 min-h-11 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div class="flex flex-col gap-1">
                            <label htmlFor={`time-input-${id}`} class="text-[11px] text-gray-400">
                                Hora
                            </label>
                            <input
                                id={`time-input-${id}`}
                                type="time"
                                value={timeVal.value}
                                disabled={!dateVal.value}
                                onInput={(e) => (timeVal.value = e.currentTarget.value)}
                                class="text-xs border border-gray-200 rounded px-2 py-1.5 min-h-11 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                            />
                        </div>

                        <div class="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
                            <button
                                type="button"
                                onClick={handleClear}
                                disabled={isSubmitting.value}
                                class="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-3 py-2.5 min-h-11 rounded"
                            >
                                <TrashIcon size={14} /> Quitar
                            </button>

                            <div class="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => (isOpen.value = false)}
                                    class="text-xs text-gray-500 hover:bg-gray-100 px-3 py-2.5 min-h-11 rounded"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSubmitting.value}
                                    class="text-xs bg-blue-600 text-white hover:bg-blue-700 px-3 py-2.5 min-h-11 rounded font-medium disabled:opacity-50"
                                >
                                    {isSubmitting.value ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}