import { createModel, signal } from "@preact/signals";
import { updateTask } from "../stores/tasksStore";

export const TaskEditorModel = createModel((taskId: string, initialTitle: string) => {
	const isSaving = signal(false);
	const error = signal<string | null>(null);
	// Estado para forzar la reversión visual si el servidor rechaza el cambio
	const fallbackValue = signal(initialTitle);

	return {
		isSaving,
		error,
		fallbackValue,

		async commitChange(newTitle: string) {
			const cleanTitle = newTitle.trim();

			// Prevención de peticiones en blanco o sin cambios reales
			if (!cleanTitle || cleanTitle === this.fallbackValue.value) return;

			this.isSaving.value = true;
			this.error.value = null;

			const success = await updateTask(taskId, { title: cleanTitle });

			if (!success) {
				this.error.value = "Error al guardar. Se restauró el valor original.";

				// Forzamos la reactividad de Zag inyectando el espacio con Template Literals
				this.fallbackValue.value = `${this.fallbackValue.value} `;
				setTimeout(() => {
					this.fallbackValue.value = this.fallbackValue.value.trim();
				}, 0);
			} else {
				this.fallbackValue.value = cleanTitle; // Sellamos el nuevo estado base
			}

			this.isSaving.value = false;
		},
	};
});
