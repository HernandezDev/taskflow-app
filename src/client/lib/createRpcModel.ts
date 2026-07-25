import type { ReadonlySignal } from "@preact/signals-core";
import { batch, createModel, effect, signal } from "@preact/signals-core";

export interface RpcResource<T> {
	data: ReadonlySignal<T>;
	isLoading: ReadonlySignal<boolean>;
	error: ReadonlySignal<Error | null>;
	execute: () => Promise<void>;
	mutate: (updater: (prev: T) => T) => void;
}

export function createRpcModel<T>(
	fetchFn: (abortSignal: AbortSignal) => Promise<T>,
	initialData: T,
): RpcResource<T> & { [Symbol.dispose]: () => void } {
	const RpcResourceModel = createModel<RpcResource<T>>(() => {
		const data = signal<T>(initialData);
		const isLoading = signal<boolean>(true);
		const error = signal<Error | null>(null);

		// 1. El controlador ahora vive seguro dentro del closure del modelo
		let controller: AbortController | null = null;

		// 2. REGISTRO DE LIMPIEZA OFICIAL (Regla 3.3 de agents.md)
		// createModel tomará esta función de retorno y la vinculará al Symbol.dispose
		effect(() => {
			return () => {
				controller?.abort();
			};
		});

		// Pasamos a async/await para controlar mejor el flujo
		const execute = async () => {
			controller?.abort();
			controller = new AbortController();

			// Batch inicial: Limpiamos errores y activamos loading de golpe
			batch(() => {
				isLoading.value = true;
				error.value = null;
			});

			try {
				const res = await fetchFn(controller.signal);

				// Batch de éxito: Actualizamos datos y apagamos loading a la vez
				batch(() => {
					data.value = res;
					isLoading.value = false;
				});
			} catch (err: unknown) {
				// Comprobación Type-Safe para ver si es un AbortError
				const isAbortError =
					(err instanceof Error && err.name === "AbortError") ||
					(err instanceof DOMException && err.name === "AbortError");

				if (!isAbortError) {
					// Batch de error: Asignamos error y apagamos loading a la vez
					batch(() => {
						error.value = err instanceof Error ? err : new Error("RPC Fetch Failed");
						isLoading.value = false;
					});
				}
				// Nota: Si ES un AbortError, significa que otra petición pisó a esta o el componente se desmontó.
				// Dejamos isLoading en true porque la nueva petición está en curso (o el componente ya no existe).
			}
		};

		// Disparo inicial automático
		execute();

		return {
			data,
			isLoading,
			error,
			execute,
			mutate: (updater) => {
				data.value = updater(data.value);
			},
		};
	});

	// 3. Retornamos la instancia pura.
	// No hace falta mutarla; el motor ya orquestó el Symbol.dispose internamente.
	return new RpcResourceModel() as RpcResource<T> & { [Symbol.dispose]: () => void };
}
