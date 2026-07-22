import type { ReadonlySignal } from "@preact/signals-core";
import { batch, computed, signal } from "@preact/signals-core";
import { authClient } from "../lib/auth-client";

type User = typeof authClient.$Infer.Session.user;
type Session = typeof authClient.$Infer.Session.session;

export interface AuthStore {
	user: ReadonlySignal<User | null>;
	session: ReadonlySignal<Session | null>;
	isAuthenticated: ReadonlySignal<boolean>;
	isInitializing: ReadonlySignal<boolean>; // Para la carga global (App/Router)
	isPending: ReadonlySignal<boolean>; // Para los botones de los formularios

	checkSession(): Promise<void>;
	login(email: string, password: string): Promise<{ data: unknown; error: unknown }>;
	signUp(email: string, password: string, name: string): Promise<{ data: unknown; error: unknown }>;
	logout(): Promise<void>;
}

// 1. Estado Atómico Privado (Encapsulado en el módulo)
const sessionSignal = signal<Session | null>(null);
const userSignal = signal<User | null>(null);
const isInitSignal = signal<boolean>(true);
const isPendingSignal = signal<boolean>(false);

// 2. Contrato Público (Singleton Literal Puro)
export const authStore: AuthStore = {
	// Lecturas reactivas
	user: userSignal,
	session: sessionSignal,
	isAuthenticated: computed(() => !!sessionSignal.value),
	isInitializing: isInitSignal,
	isPending: isPendingSignal,

	// Mutaciones de Red
	async checkSession() {
		try {
			const { data } = await authClient.getSession();
			batch(() => {
				sessionSignal.value = data?.session ?? null;
				userSignal.value = data?.user ?? null;
			});
		} catch (error) {
			console.error("Error de sesión:", error);
		} finally {
			isInitSignal.value = false;
		}
	},

	async login(email, password) {
		if (isPendingSignal.value) return { data: null, error: new Error("En curso") };

		isPendingSignal.value = true;
		try {
			const { data, error } = await authClient.signIn.email({ email, password });
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
