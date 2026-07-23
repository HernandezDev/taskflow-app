import type { ReadonlySignal } from "@preact/signals-core";
import { batch, computed, signal } from "@preact/signals-core";
import { authClient } from "../lib/auth-client";

type User = typeof authClient.$Infer.Session.user;
type Session = typeof authClient.$Infer.Session.session;

export interface AuthStore {
	user: ReadonlySignal<User | null>;
	session: ReadonlySignal<Session | null>;
	isAuthenticated: ReadonlySignal<boolean>;
	isInitializing: ReadonlySignal<boolean>;
	isPending: ReadonlySignal<boolean>;

	checkSession(): Promise<void>;
	login(email: string, password: string): Promise<{ data: unknown; error: unknown }>;
	signUp(email: string, password: string, name: string): Promise<{ data: unknown; error: unknown }>;
	logout(): Promise<void>;
}

// 1. Estado Atómico Privado
const sessionSignal = signal<Session | null>(null);
const userSignal = signal<User | null>(null);
const isInitSignal = signal<boolean>(true);
const isPendingSignal = signal<boolean>(false);

// Candado en RAM para evitar Condiciones de Carrera de Red (Strict Mode / Doble F5)
let sessionPromiseLock: Promise<void> | null = null;

// 2. Contrato Público
export const authStore: AuthStore = {
	user: userSignal,
	session: sessionSignal,
	isAuthenticated: computed(() => !!sessionSignal.value),
	isInitializing: isInitSignal,
	isPending: isPendingSignal,

	async checkSession() {
		if (sessionPromiseLock) return sessionPromiseLock;

		sessionPromiseLock = (async () => {
			try {
				const { data, error } = await authClient.getSession();

				if (error) {
					console.warn("[Auth] Sesión inactiva o rechazada:", error.message);
				}

				batch(() => {
					sessionSignal.value = data?.session ?? null;
					userSignal.value = data?.user ?? null;
				});
			} catch (networkError) {
				console.error("[Auth] Falla catastrófica de infraestructura:", networkError);
			} finally {
				isInitSignal.value = false;
			}
		})();

		await sessionPromiseLock;
		sessionPromiseLock = null;
	},

	async login(email, password) {
		if (isPendingSignal.value) return { data: null, error: new Error("En curso") };

		isPendingSignal.value = true;
		try {
			const { data, error } = await authClient.signIn.email({ email, password });

			// SANITY CHECK: Verificación obligatoria de almacenamiento de cookie HttpOnly
			if (!error) await this.checkSession();

			return { data, error };
		} finally {
			isPendingSignal.value = false;
		}
	},

	async signUp(email, password, name) {
		if (isPendingSignal.value) return { data: null, error: new Error("En curso") };

		isPendingSignal.value = true;
		try {
			const { data, error } = await authClient.signUp.email({ email, password, name });

			// SANITY CHECK: Verificación obligatoria de almacenamiento de cookie HttpOnly
			if (!error) await this.checkSession();

			return { data, error };
		} finally {
			isPendingSignal.value = false;
		}
	},

	async logout() {
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
