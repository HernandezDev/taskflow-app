import { computed, createModel, signal } from "@preact/signals-core";
import { authClient } from "../lib/auth-client";

// Exportamos globalmente la ÚNICA instancia creada por la fábrica (Singleton)
export const authStore = createModel(() => {
	// ==========================================
	// 1. ESTADO PRIVADO (Closures Inmutables)
	// ==========================================
	const sessionSignal = signal<Record<string, unknown> | null>(null);
	const userSignal = signal<Record<string, unknown> | null>(null);
	const isLoadingSignal = signal<boolean>(true);

	// ==========================================
	// 2. CONTRATO PÚBLICO (La interfaz para la UI)
	// ==========================================
	return {
		// ---- Estado Reactivo (Solo lectura) ----
		// Usamos computed() en lugar de getters de JS.
		// Esto crea Signals de SOLO LECTURA, protegiendo el estado privado
		// y cumpliendo las reglas estrictas de validación de createModel.
		user: computed(() => userSignal.value),
		session: computed(() => sessionSignal.value),
		isAuthenticated: computed(() => !!sessionSignal.value),
		isPending: computed(() => isLoadingSignal.value),

		// ---- Acciones Asíncronas (Mutadores) ----

		async checkSession() {
			isLoadingSignal.value = true;

			const { data, error } = await authClient.getSession();

			if (data && !error) {
				// Hacemos un cast temporal (as Record...) si Better Auth devuelve tipos complejos
				sessionSignal.value = data.session as Record<string, unknown>;
				userSignal.value = data.user as Record<string, unknown>;
			} else {
				sessionSignal.value = null;
				userSignal.value = null;
			}

			isLoadingSignal.value = false;
		},

		async login(email: string, pass: string) {
			isLoadingSignal.value = true;

			const { data, error } = await authClient.signIn.email({
				email,
				password: pass,
			});

			if (!error) {
				const sessionData = await authClient.getSession();
				if (sessionData.data) {
					sessionSignal.value = sessionData.data.session as Record<string, unknown>;
					userSignal.value = sessionData.data.user as Record<string, unknown>;
				}
			}

			isLoadingSignal.value = false;
			return { data, error };
		},

		async logout() {
			isLoadingSignal.value = true;

			await authClient.signOut();

			sessionSignal.value = null;
			userSignal.value = null;
			isLoadingSignal.value = false;
		},
		// ... dentro del return de authStore
		async signUp(email: string, password: string, name: string) {
			isLoadingSignal.value = true;

			// Llamada al cliente de Better Auth
			const { data, error } = await authClient.signUp.email({
				email,
				password,
				name,
			});

			// Si el registro fue exitoso, el usuario ya suele quedar logueado
			// o puedes redirigirlo a login directamente
			isLoadingSignal.value = false;
			return { data, error };
		},
	};
});
