import { useSignal } from "@preact/signals";

interface TaskQuickAddProps {
    onAdd: (title: string, deadline?: string | null) => Promise<boolean>;
}

export function TaskQuickAdd({ onAdd }: TaskQuickAddProps) {
    const inputValue = useSignal("");
    const isSubmitting = useSignal(false);
    const error = useSignal<string | null>(null);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();

        const title = inputValue.value.trim();
        if (!title) return;

        isSubmitting.value = true;
        error.value = null;

        const success = await onAdd(title);

        if (success) {
            inputValue.value = "";
        } else {
            error.value = "Fallo de red al crear la tarea.";
        }

        isSubmitting.value = false;
    };

    return (
        <form onSubmit={handleSubmit} class="flex flex-col gap-1 w-full">
            <div class="relative flex items-center">
                <input
                    type="text"
                    value={inputValue.value}
                    onInput={(e) => { inputValue.value = (e.target as HTMLInputElement).value; }}
                    disabled={isSubmitting.value}
                    placeholder="Escribe una tarea y presiona Enter..."
                    required
                    maxLength={255}
                    class="
                        w-full bg-white outline-none ring-1 ring-gray-300 
                        focus:ring-2 focus:ring-blue-500 rounded-md px-4 py-3 
                        text-gray-900 shadow-sm transition-all 
                        disabled:opacity-50 disabled:bg-gray-50
                    "
                />
                {isSubmitting.value && (
                    <span class="absolute right-4 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
            </div>

            {error.value && (
                <span class="text-xs text-red-500 pl-1 font-medium">{error.value}</span>
            )}
        </form>
    );
}