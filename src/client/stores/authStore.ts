import type { ReadonlySignal } from "@preact/signals-core";
import { batch, computed, createModel, signal } from "@preact/signals-core";
import { authClient } from "../lib/auth-client";

type User = typeof authClient.$Infer.Session.user;
type Session = typeof authClient.$Infer.Session.session;

export interface AuthStore {
	user: ReadonlySignal<User | null>;
	session: ReadonlySignal<Session | null>;
	isAuthenticated: ReadonlySignal<boolean>;

	// 🚀 SEPARACIÓN DE ESTADOS DE CARGA
	isInitializing: ReadonlySignal<boolean>; // Para la carga global (App/Router)
	isPending: ReadonlySignal<boolean>; // Para los botones de los formularios

	checkSession(): Promise<void>;
	login(email: string, password: string): Promise<{ data: unknown; error: unknown }>;
	signUp(email: string, password: string, name: string): Promise<{ data: unknown; error: unknown }>;
	logout(): Promise<void>;
}

// Creamos la fábrica del Store Global
const createAuthStore = createModel<AuthStore>(() => {
	const sessionSignal = signal<Session | null>(null);
	const userSignal = signal<User | null>(null);

	// 🚀 Empieza en TRUE para que la app espere la verificación inicial
	const isInitSignal = signal<boolean>(true);
	// 🚀 Empieza en FALSE para los formularios
	const isPendingSignal = signal<boolean>(false);

	return {
		user: userSignal,
		session: sessionSignal,
		isAuthenticated: computed(() => !!sessionSignal.value),
		isInitializing: isInitSignal,
		isPending: isPendingSignal,

		async checkSession() {
			try {
				const { data } = await authClient.getSession();
				batch(() => {
					sessionSignal.value = data?.session ?? null;
					userSignal.value = data?.user ?? null;
				});
			} catch (error) {
				console.error("Error al verificar sesión:", error);
			} finally {
				// 🚀 Liberamos la carga global de la App, pase lo que pase
				isInitSignal.value = false;
			}
		},

		async login(email, password) {
			// 🚀 SEGURIDAD: Bloqueo de concurrencia contra doble clic
			if (isPendingSignal.value) return { data: null, error: new Error("Petición en curso") };

			isPendingSignal.value = true;
			try {
				const { data, error } = await authClient.signIn.email({ email, password });
				if (!error) {
					await this.checkSession();
				}
				return { data, error };
			} finally {
				isPendingSignal.value = false;
			}
		},

		async signUp(email, password, name) {
			// 🚀 SEGURIDAD: Bloqueo de concurrencia
			if (isPendingSignal.value) return { data: null, error: new Error("Petición en curso") };

			isPendingSignal.value = true;
			try {
				const { data, error } = await authClient.signUp.email({ email, password, name });
				if (!error) {
					await this.checkSession();
				}
				return { data, error };
			} finally {
				isPendingSignal.value = false;
			}
		},

		async logout() {
			// 🚀 SEGURIDAD: Bloqueo de concurrencia
			if (isPendingSignal.value) return;

			isPendingSignal.value = true;
			try {
				await authClient.signOut();
				batch(() => {
					sessionSignal.value = null;
					userSignal.value = null;
				});
			} finally {
				isPendingSignal.value = false;
			}
		},
	};
});

// Exportamos la instancia única (Singleton)
export const authStore = new createAuthStore();
