import { createModel, signal } from "@preact/signals";

/**
 * Fábrica de modelos reactivos puros para gestionar peticiones RPC.
 * Desacoplada del ciclo de renderizado de Preact.
 * * @param fetchFn Función asíncrona que recibe un AbortSignal y retorna los datos.
 * @param initialData Valor inicial para el signal de datos.
 */
export function createRpcModel<T>(
	fetchFn: (abortSignal: AbortSignal) => Promise<T>,
	initialData: T,
) {
	// Definimos el modelo interno
	const RpcResourceModel = createModel(() => {
		// 1. Estado reactivo encapsulado
		const data = signal<T>(initialData);
		const isLoading = signal<boolean>(true);
		const error = signal<Error | null>(null);

		// Controlador para cancelar peticiones en vuelo (Race conditions)
		let controller: AbortController | null = null;

		// 2. Lógica de ejecución centralizada
		const execute = () => {
			// Si hay una petición anterior en curso, la cancelamos inmediatamente
			if (controller) {
				controller.abort();
			}

			// Instanciamos un nuevo controlador para esta ejecución
			controller = new AbortController();

			isLoading.value = true;
			error.value = null;

			fetchFn(controller.signal)
				.then((res) => {
					data.value = res;
				})
				.catch((err) => {
					// Ignoramos los errores causados por cancelaciones intencionales
					if (err.name !== "AbortError") {
						error.value = err instanceof Error ? err : new Error("RPC Fetch Failed");
						console.error("Hono RPC Error:", err);
					}
				})
				.finally(() => {
					isLoading.value = false;
				});
		};

		// 3. Ejecución inicial automática al instanciar el modelo
		execute();

		// 4. Interfaz pública del modelo
		return {
			data,
			isLoading,
			error,
			execute, // Expuesto por si se necesita forzar un re-fetch (ej. botón "Actualizar")

			// 5. Destructor nativo (Garbage Collection y limpieza de red)
			[Symbol.dispose]() {
				if (controller) {
					controller.abort();
				}
			},
		};
	});

	// Retornamos la instancia viva del modelo
	return new RpcResourceModel();
}
