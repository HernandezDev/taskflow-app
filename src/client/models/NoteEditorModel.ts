import { computed, createModel, signal } from "@preact/signals";
import { updateTask } from "../stores/tasksStore"; // Consumimos el estado global

// 1. Definición del modelo usando la fábrica nativa
export const NoteEditorModel = createModel((initialText: string, taskId: string) => {
	// ESTADO EFÍMERO (Mapeado directo a la UI)
	const draftText = signal(initialText);
	const isSaving = signal(false);
	const error = signal<string | null>(null);

	// ESTADO DERIVADO
	const isDirty = computed(() => draftText.value !== initialText);
	const isValid = computed(() => draftText.value.trim().length > 0);

	return {
		draftText,
		isSaving,
		error,
		isDirty,
		isValid,

		// ACCIONES
		async save() {
			if (!this.isDirty.value || !this.isValid.value) return false;

			this.isSaving.value = true;
			this.error.value = null;

			// Invocación a la capa de infraestructura (Store Global)
			const success = await updateTask(taskId, { title: this.draftText.value });

			if (!success) {
				this.error.value = "Error de red al guardar. Intenta nuevamente.";
				this.isSaving.value = false;
				return false;
			}

			// Nota: Si tiene éxito, el padre destruirá este modelo,
			// por lo que no hace falta resetear isSaving a false aquí.
			return true;
		},

		cancel() {
			this.draftText.value = initialText;
			this.error.value = null;
		},
	};
});
