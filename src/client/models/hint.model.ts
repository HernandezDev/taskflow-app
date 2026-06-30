import type { InferResponseType } from "hono/client";
import { rpc } from "../lib/api";
import { createRpcModel } from "../lib/createRpcModel";

// 1. Magia de Hono: Inferimos la respuesta exitosa del endpoint exacto
// Apuntamos a `rpc.api.hint.$get` para decirle a TS de dónde sacar el tipo.
type HintResponse = InferResponseType<typeof rpc.api.hint.$get>;

export function createHintModel() {
	return createRpcModel<HintResponse>(
		async (signal) => {
			const res = await rpc.api.hint.$get({}, { init: { signal } });

			// TS ya sabe que res.json() devuelve un objeto de tipo HintResponse
			return await res.json();
		},
		// 2. El estado inicial (TS te exigirá que cumpla con HintResponse)
		{ message: "Conectando con el Edge..." },
	);
}
