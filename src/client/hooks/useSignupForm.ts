import type { ReadonlySignal } from "@preact/signals";
import { useSignal } from "@preact/signals";
import { usePrefetch } from "./usePrefetch"; // Importamos tu hook de precarga

export function useSignupForm() {
	// 1. Estado Local
	const form = useSignal({ nombre: "", email: "", password: "", confirmPassword: "" });
	const erroresTexto = useSignal<Record<string, string[]>>({});
	const reglasPass = useSignal({ length: false, upper: false, number: false });

	// 🚀 2. LA MAGIA: El hook se encarga de precargar Zod y el esquema en segundo plano
	const obtenerValidador = usePrefetch(() => import("../lib/signUpValidator"));

	const limpiarCampo = (campo: string) => {
		if (erroresTexto.value[campo]) {
			const copia = { ...erroresTexto.value };
			delete copia[campo];
			erroresTexto.value = copia;
		}
	};

	// 3. Manejador de Inputs (Ahora es asíncrono porque espera a Zod)
	const manejarInput = async (campo: keyof typeof form.value, valor: string) => {
		form.value = { ...form.value, [campo]: valor };
		limpiarCampo(campo);

		// Solo necesitamos evaluar Zod en tiempo real para las contraseñas
		if (campo === "password" || campo === "confirmPassword") {
			const modulo = await obtenerValidador();
			const resultado = modulo.validateForm(form.value);
			reglasPass.value = resultado.reglasPassword;
		}
	};

	// 4. Validador final para el Submit
	const validarSubmit = async () => {
		erroresTexto.value = {};
		const modulo = await obtenerValidador();
		const resultado = modulo.validateForm(form.value);

		if (!resultado.exito) {
			erroresTexto.value = resultado.erroresCampos;
			reglasPass.value = resultado.reglasPassword;
			return false; // Bloquea el envío
		}

		return true; // Da luz verde para enviar a la API
	};

	return {
		// Signals de solo lectura
		form: form as ReadonlySignal<typeof form.value>,
		erroresTexto: erroresTexto as ReadonlySignal<Record<string, string[]>>,
		reglasPass: reglasPass as ReadonlySignal<{ length: boolean; upper: boolean; number: boolean }>,

		// Métodos
		manejarInput,
		validarSubmit,
	};
}
