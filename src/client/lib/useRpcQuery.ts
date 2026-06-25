import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export function useRpcQuery<T>(fetchFn: (abortSignal: AbortSignal) => Promise<T>, initialData: T) {
	const data = useSignal<T>(initialData);
	const isLoading = useSignal<boolean>(true);
	const error = useSignal<Error | null>(null);

	useEffect(() => {
		const controller = new AbortController();

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

		return () => controller.abort();
	}, []);

	return { data, isLoading, error };
}
