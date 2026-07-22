import { useSignal } from "@preact/signals";
import { addTask } from "../../stores/tasksStore"; 
// Nota: Usamos 'addTask' para coincidir exactamente con la función exportada 
// en tu tasksStore.ts actual.

export function TaskQuickAdd() {
    // Adopción de Features Modernas: Preact Signals para estado local efímero.
    // Esto muta el DOM directamente sin forzar un re-render de todo el DashboardScreen.
    const inputValue = useSignal("");
    const isSubmitting = useSignal(false);
    const error = useSignal<string | null>(null);

    const handleSubmit = async (e: Event) => {
        e.preventDefault(); // Bloqueo de la mutación de recarga nativa
        
        const title = inputValue.value.trim();
        if (!title) return; // Guardia síncrono

        isSubmitting.value = true;
        error.value = null;

        // Delegamos la mutación de red a tu store global
        const success = await addTask(title);

        if (success) {
            inputValue.value = ""; // Vaciamos el input si la inserción en Turso fue exitosa
        } else {
            error.value = "Fallo de red al crear la tarea.";
        }

        isSubmitting.value = false;
    };

    return (
        <form 
            onSubmit={handleSubmit} 
            class="flex flex-col gap-1 w-full"
        >
            <div class="relative flex items-center">
                <input
                    type="text"
                    value={inputValue.value}
                    onInput={(e) => { inputValue.value = (e.target as HTMLInputElement).value; }}
                    disabled={isSubmitting.value}
                    placeholder="Escribe una tarea y presiona Enter..."
                    required
                    maxLength={255} // Validación delegada al navegador, alineada con Zod
                    class="
                        w-full bg-white outline-none ring-1 ring-gray-300 
                        focus:ring-2 focus:ring-blue-500 rounded-md px-4 py-3 
                        text-gray-900 shadow-sm transition-all 
                        disabled:opacity-50 disabled:bg-gray-50
                    "
                />
                
                {/* Feedback visual de red (Indicador de carga) */}
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