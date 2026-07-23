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

		// MODIFICACIÓN CRÍTICA 1: Inicia en false.
		// Si no hay ejecución automática, el estado inicial es inactivo, no "cargando".
		const isLoading = signal<boolean>(false);
		const error = signal<Error | null>(null);

		let controller: AbortController | null = null;

		effect(() => {
			return () => {
				controller?.abort();
			};
		});

		const execute = async () => {
			controller?.abort();
			controller = new AbortController();

			batch(() => {
				isLoading.value = true;
				error.value = null;
			});

			try {
				const res = await fetchFn(controller.signal);

				batch(() => {
					data.value = res;
					isLoading.value = false;
				});
			} catch (err: unknown) {
				const isAbortError =
					(err instanceof Error && err.name === "AbortError") ||
					(err instanceof DOMException && err.name === "AbortError");

				if (!isAbortError) {
					batch(() => {
						error.value = err instanceof Error ? err : new Error("RPC Fetch Failed");
						isLoading.value = false;
					});
				}
			}
		};

		// MODIFICACIÓN CRÍTICA 2: Amputación del auto-fetch.
		// Se elimina la invocación a execute() del cuerpo de la factoría.

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

	return new RpcResourceModel() as RpcResource<T> & { [Symbol.dispose]: () => void };
}
