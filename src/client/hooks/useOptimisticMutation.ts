import { useSignal, useSignalEffect } from "@preact/signals";

export function useOptimisticMutation<T>(
	initialValue: T,
	mutationFn: (newValue: T) => Promise<boolean>,
) {
	const localValue = useSignal<T>(initialValue);
	const isSaving = useSignal(false);
	const errorMsg = useSignal<string | null>(null);

	// Hidratación Top-Down
	useSignalEffect(() => {
		localValue.value = initialValue;
	});

	// Vía de escape para Inputs Continuos (tipeo en Editable)
	const updateLocalOnly = (newValue: T) => {
		localValue.value = newValue;
	};

	// Vía de ejecución para red (Enter en Editable o Clic en Radio)
	const commitChange = async (newValue: T) => {
		// Validación contra el valor consolidado (initialValue), no el efímero
		if (newValue === initialValue) return;

		localValue.value = newValue;
		isSaving.value = true;
		errorMsg.value = null;

		const success = await mutationFn(newValue);

		if (!success) {
			// Rollback determinista al estado inicial validado
			localValue.value = initialValue;
			errorMsg.value = "Error de red. Cambios revertidos.";
		}

		isSaving.value = false;
	};

	return { localValue, updateLocalOnly, isSaving, errorMsg, commitChange };
}
