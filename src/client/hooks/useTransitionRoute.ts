import { useLocation } from "preact-iso";

interface TransitionOptions {
	replace?: boolean;
	direction?: "forward" | "backward";
}

export function useTransitionRoute() {
	const { route } = useLocation();

	const navigate = (path: string, options?: TransitionOptions) => {
		const { replace = false, direction = "forward" } = options || {};

		if (!document.startViewTransition) {
			route(path, replace);
			return;
		}

		if (direction === "backward") {
			document.documentElement.classList.add("back-transition");
		}

		const transition = document.startViewTransition(() => route(path, replace));

		// La API cancela automáticamente una transición si otra arranca antes de
		// que termine (comportamiento normal del spec cuando hay navegaciones
		// encadenadas rápido, ej. un guard de auth seguido de una navegación
		// explícita). En Firefox/Safari esto rechaza `finished` con AbortError/
		// DOMException — lo silenciamos a propósito, no es un error real.
		transition.finished.catch(() => {});

		transition.finished.finally(() => {
			document.documentElement.classList.remove("back-transition");
		});
	};

	return navigate;
}
