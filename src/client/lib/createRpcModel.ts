import type { ReadonlySignal } from "@preact/signals-core";
import { createModel, signal } from "@preact/signals-core";

interface RpcResource<T> {
	data: ReadonlySignal<T>;
	isLoading: ReadonlySignal<boolean>;
	error: ReadonlySignal<Error | null>;
	execute: () => void;
	mutate: (updater: (prev: T) => T) => void;
}

export function createRpcModel<T>(
	fetchFn: (abortSignal: AbortSignal) => Promise<T>,
	initialData: T,
): RpcResource<T> & { dispose: () => void } {
	// 1. La fábrica solo gestiona lo que Preact quiere ver
	const RpcResourceModel = createModel<RpcResource<T>>(() => {
		const data = signal<T>(initialData);
		const isLoading = signal<boolean>(true);
		const error = signal<Error | null>(null);
		let controller: AbortController | null = null;

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

	const instance = new RpcResourceModel();

	// 2. Decoramos la instancia fuera de la factoría para evitar conflictos
	return Object.assign(instance, {
		dispose: () => {
			// Aquí puedes acceder al controller si lo expones o manejas la lógica
			// Pero al ser un decorador, mantienes el objeto "puro" para createModel
		},
	});
}
