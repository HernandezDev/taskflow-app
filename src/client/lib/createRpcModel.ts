import type { ReadonlySignal } from "@preact/signals-core";
import { batch, createModel, signal } from "@preact/signals-core";

export interface RpcResource<T> {
	data: ReadonlySignal<T>;
	isLoading: ReadonlySignal<boolean>;
	error: ReadonlySignal<Error | null>;
	execute: () => void;
	mutate: (updater: (prev: T) => T) => void;
}

export function createRpcModel<T>(
	fetchFn: (abortSignal: AbortSignal) => Promise<T>,
	initialData: T,
): RpcResource<T> & { [Symbol.dispose]: () => void } {
	let controller: AbortController | null = null;

	const RpcResourceModel = createModel<RpcResource<T>>(() => {
		const data = signal<T>(initialData);
		const isLoading = signal<boolean>(true);
		const error = signal<Error | null>(null);

		// 2. Pasamos a async/await para controlar mejor el flujo
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
				// Reemplazamos "any" por "unknown" por seguridad
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
				// Nota: Si ES un AbortError, significa que otra petición pisó a esta.
				// Dejamos isLoading en true porque la nueva petición está en curso.
			}
		};

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

	const instance = new RpcResourceModel() as RpcResource<T> & { [Symbol.dispose]: () => void };

	instance[Symbol.dispose] = () => {
		controller?.abort();
	};

	return instance;
}
