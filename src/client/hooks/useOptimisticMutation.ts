import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks"; // Dependencia corregida

export function useOptimisticMutation<T>(
	initialValue: T,
	mutationFn: (newValue: T) => Promise<boolean>,
) {
	const localValue = useSignal<T>(initialValue);
	const isSaving = useSignal(false);
	const errorMsg = useSignal<string | null>(null);

	// Hidratación determinista acoplada al ciclo de vida del VDOM
	useEffect(() => {
		localValue.value = initialValue;
	}, [initialValue]); // Ahora el motor vigila cambios en la variable estática

	const updateLocalOnly = (newValue: T) => {
		localValue.value = newValue;
	};

	const commitChange = async (newValue: T) => {
		if (newValue === initialValue) return;

		localValue.value = newValue;
		isSaving.value = true;
		errorMsg.value = null;

		const success = await mutationFn(newValue);

		if (!success) {
			localValue.value = initialValue;
			errorMsg.value = "Error de red. Cambios revertidos.";
		}

		isSaving.value = false;
	};

	return { localValue, updateLocalOnly, isSaving, errorMsg, commitChange };
}
