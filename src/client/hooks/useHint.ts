import { rpc } from "../lib/api";
import { useRpcQuery } from "../lib/useRpcQuery"; // Ajusta la ruta si lo pusiste en otro lado

export function useHint() {
	return useRpcQuery(
		(signal) => rpc.api.hint.$get({}, { init: { signal } }).then((res) => res.json()),
		{ message: "Conectando con el Edge..." }, // Estado inicial tipado inferido
	);
}
