import type { ReadonlySignal } from "@preact/signals";
import { useSignal } from "@preact/signals";

export function useFormErrors() {
	// 1. ESTADO PRIVADO (Mutable internamente)
	const errores = useSignal<Record<string, string[]>>({});

	return {
		textos: errores as ReadonlySignal<Record<string, string[]>>,

		// 3. MÉTODOS PÚBLICOS (La única forma legal de mutar)
		limpiarCampo: (campo: string) => {
			if (errores.value[campo]) {
				const copia = { ...errores.value };
				delete copia[campo];
				errores.value = copia;
			}
		},

		setErrores: (nuevosErrores: Record<string, string[]>) => {
			errores.value = nuevosErrores;
		},

		limpiarTodos: () => {
			errores.value = {};
		},
	};
}
