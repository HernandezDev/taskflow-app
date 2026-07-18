import { createModel, signal } from "@preact/signals-core";

// 1. Tipado Genérico: Exigimos una función mutadora (Dependency Injection)
type MutationFn = (newValue: string) => Promise<boolean>;

export const AsyncFieldMutatorModel = createModel(
	(
		initialValue: string,
		mutationFn: MutationFn, // Inversión de Control: El modelo no sabe qué ejecuta esto
	) => {
		const isSaving = signal(false);
		const error = signal<string | null>(null);
		const fallbackValue = signal(initialValue);

		return {
			isSaving,
			error,
			fallbackValue,

			async commitChange(newValue: string) {
				const cleanValue = newValue.trim();

				if (!cleanValue || cleanValue === this.fallbackValue.value) return;

				this.isSaving.value = true;
				this.error.value = null;

				// 2. Ejecución agnóstica de la transacción de red
				const success = await mutationFn(cleanValue);

				if (!success) {
					this.error.value = "Error al guardar. Operación revertida.";
					this.fallbackValue.value = `${this.fallbackValue.value} `;
					setTimeout(() => {
						this.fallbackValue.value = this.fallbackValue.value.trim();
					}, 0);
				} else {
					this.fallbackValue.value = cleanValue;
				}

				this.isSaving.value = false;
			},
		};
	},
);
