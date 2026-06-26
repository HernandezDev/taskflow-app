import { useEffect, useMemo } from "preact/hooks";

// Tipamos genéricamente para aceptar cualquier modelo que opcionalmente tenga un destructor
export function useModel<T extends { [Symbol.dispose]?: () => void }>(ModelFactory: () => T): T {
	// 1. INSTANCIACIÓN: Creamos el modelo UNA SOLA VEZ cuando el componente nace.
	// Usamos useMemo para que Preact no lo vuelva a crear en re-renders accidentales.
	const model = useMemo(() => ModelFactory(), []);

	// 2. CICLO DE VIDA (Garbage Collection): Atamos el modelo a la vida del componente.
	useEffect(() => {
		// Cuando el componente se desmonta de la pantalla, ejecutamos el return
		return () => {
			model[Symbol.dispose]?.();
		};
	}, [model]);

	// 3. RETORNO: Entregamos la instancia lista para usar en el JSX
	return model;
}
