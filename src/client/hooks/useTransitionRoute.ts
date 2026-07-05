import { useLocation } from "preact-iso";

interface TransitionOptions {
	replace?: boolean;
	direction?: "forward" | "backward";
}

export function useTransitionRoute() {
	const { route } = useLocation();

	const navigate = (path: string, options?: TransitionOptions) => {
		// Valores por defecto estructurados
		const { replace = false, direction = "forward" } = options || {};

		// Fallback para navegadores antiguos
		if (!document.startViewTransition) {
			route(path, replace); // Pasamos 'replace' nativamente
			return;
		}

		// Si vamos hacia atrás, "marcamos" el documento
		if (direction === "backward") {
			document.documentElement.classList.add("back-transition");
		}

		// Ejecutamos la transición pasándole el parámetro 'replace' a preact-iso
		const transition = document.startViewTransition(() => route(path, replace));

		// Limpiamos la clase cuando la animación haya terminado
		transition.finished.finally(() => {
			document.documentElement.classList.remove("back-transition");
		});
	};

	return navigate;
}
