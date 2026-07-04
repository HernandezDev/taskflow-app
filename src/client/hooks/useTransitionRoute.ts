import { useLocation } from "preact-iso";

export function useTransitionRoute() {
	const { route } = useLocation();

	const navigate = (path: string) => {
		if (document.startViewTransition) {
			document.startViewTransition(() => route(path));
		} else {
			route(path);
		}
	};

	return navigate;
}
