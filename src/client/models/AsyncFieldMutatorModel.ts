import { createModel, signal } from "@preact/signals";

// 1. Inyección de Genérico <T>: El tipo exacto se decidirá en tiempo de instanciación
export const AsyncFieldMutatorModel = createModel(
	<T>(initialValue: T, mutationFn: (newValue: T) => Promise<boolean>) => {
		const isSaving = signal(false);
		const error = signal<string | null>(null);
		const fallbackValue = signal<T>(initialValue);

		return {
			isSaving,
			error,
			fallbackValue,

			async commitChange(newValue: T) {
				// Validación de equivalencia estricta para evitar I/O innecesario
				if (newValue === this.fallbackValue.value) return;

				// Nota: Se elimina el .trim() y validación falsy agresiva porque
				// un valor false numérico (0) o booleano (false) son mutaciones válidas.
				// La validación de dominio (ej. strings vacíos) debe delegarse al componente de UI
				// o al validador Zod en el servidor.

				this.isSaving.value = true;
				this.error.value = null;

				const success = await mutationFn(newValue);

				if (!success) {
					this.error.value = "Error al guardar. Operación revertida.";

					// Rollback Universal: Forzamos la reactividad re-asignando el objeto/primitiva
					// clonándolo (si es objeto) o forzando un tick temporal.
					const originalValue = this.fallbackValue.value;
					this.fallbackValue.value = Array.isArray(originalValue)
						? ([...originalValue] as unknown as T)
						: typeof originalValue === "object" && originalValue !== null
							? ({ ...originalValue } as unknown as T)
							: originalValue; // Las primitivas no requieren forzar mutación estructural profunda para Preact Signals.
				} else {
					this.fallbackValue.value = newValue;
				}

				this.isSaving.value = false;
			},
		};
	},
);
