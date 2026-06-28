import { computed, createModel, signal } from "@preact/signals-core";

/**
 * Fábrica de modelos reactivos puros para gestionar peticiones RPC de Hono.
 *
 */
export function createRpcModel<T>(
	fetchFn: (abortSignal: AbortSignal) => Promise<T>,
	initialData: T,
) {
	const RpcResourceModel = createModel(() => {
		const data = signal<T>(initialData);
		const isLoading = signal<boolean>(true);
		const error = signal<Error | null>(null);
		let controller: AbortController | null = null;

		const execute = () => {
			if (controller) controller.abort();
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
						console.error("Hono RPC Error:", err);
					}
				})
				.finally(() => {
					isLoading.value = false;
				});
		};

		// Ejecución inicial automática
		execute();

		// Puerta controlada para mutaciones locales (Optimistic UI)
		const mutate = (updater: (prevData: T) => T) => {
			data.value = updater(data.value);
		};

		return {
			// Signals blindados (Solo lectura para la UI)
			data: computed(() => data.value),
			isLoading: computed(() => isLoading.value),
			error: computed(() => error.value),

			// Acciones
			execute,
			mutate,

			// Destructor
			[Symbol.dispose]() {
				if (controller) controller.abort();
			},
		};
	});

	return new RpcResourceModel();
}
