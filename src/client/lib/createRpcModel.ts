import type { ReadonlySignal } from "@preact/signals-core";
import { createModel, signal } from "@preact/signals-core";

export interface RpcResource<T> {
	data: ReadonlySignal<T>;
	isLoading: ReadonlySignal<boolean>;
	error: ReadonlySignal<Error | null>;
	execute: () => void;
	mutate: (updater: (prev: T) => T) => void;
}

// 1. Declaramos explícitamente que devolvemos un objeto con [Symbol.dispose]
export function createRpcModel<T>(
	fetchFn: (abortSignal: AbortSignal) => Promise<T>,
	initialData: T,
): RpcResource<T> & { [Symbol.dispose]: () => void } {
	// 2. Mantenemos el controller en el closure exterior para que el dispose pueda verlo
	let controller: AbortController | null = null;

	const RpcResourceModel = createModel<RpcResource<T>>(() => {
		const data = signal<T>(initialData);
		const isLoading = signal<boolean>(true);
		const error = signal<Error | null>(null);

		const execute = () => {
			controller?.abort();
			controller = new AbortController();

			isLoading.value = true;
			error.value = null;

			fetchFn(controller.signal)
				.then((res) => {
					data.value = res;
				})
				.catch((err) => {
					if (err.name !== "AbortError") {
						error.value = err instanceof Error ? err : new Error("RPC Fetch Failed");
					}
				})
				.finally(() => {
					isLoading.value = false;
				});
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

	// 3. Instanciamos el modelo
	// Usamos 'as' para decirle a TS que vamos a inyectarle el Symbol.dispose
	const instance = new RpcResourceModel() as RpcResource<T> & { [Symbol.dispose]: () => void };

	// 4. Se lo inyectamos directamente a la instancia (fuera del createModel)
	instance[Symbol.dispose] = () => {
		controller?.abort();
	};

	return instance;
}
