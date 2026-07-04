// src/client/stores/authStore.ts
import type { ReadonlySignal } from "@preact/signals-core";
import { batch, computed, createModel, signal } from "@preact/signals-core";
import { authClient } from "../lib/auth-client";

type User = typeof authClient.$Infer.Session.user;
type Session = typeof authClient.$Infer.Session.session;

export interface AuthStore {
	user: ReadonlySignal<User | null>;
	session: ReadonlySignal<Session | null>;
	isAuthenticated: ReadonlySignal<boolean>;
	isPending: ReadonlySignal<boolean>;

	checkSession(): Promise<void>;
	login(email: string, password: string): Promise<{ data: unknown; error: unknown }>;
	signUp(email: string, password: string, name: string): Promise<{ data: unknown; error: unknown }>;
	logout(): Promise<void>;
}

// Creamos la fábrica del Store Global (Renombrado para semántica correcta)
const createAuthStore = createModel<AuthStore>(() => {
	const sessionSignal = signal<Session | null>(null);
	const userSignal = signal<User | null>(null);
	const isLoadingSignal = signal<boolean>(false);

	return {
		user: userSignal,
		session: sessionSignal,
		isAuthenticated: computed(() => !!sessionSignal.value),
		isPending: isLoadingSignal,

		async checkSession() {
			isLoadingSignal.value = true;
			try {
				const { data } = await authClient.getSession();
				batch(() => {
					sessionSignal.value = data?.session ?? null;
					userSignal.value = data?.user ?? null;
				});
			} finally {
				// Siempre se ejecuta, haya error o no
				isLoadingSignal.value = false;
			}
		},

		async login(email, password) {
			isLoadingSignal.value = true;
			try {
				const { data, error } = await authClient.signIn.email({ email, password });
				if (!error) {
					await this.checkSession();
				}
				return { data, error };
			} finally {
				isLoadingSignal.value = false;
			}
		},

		async signUp(email, password, name) {
			isLoadingSignal.value = true;
			try {
				const { data, error } = await authClient.signUp.email({ email, password, name });
				if (!error) {
					await this.checkSession();
				}
				return { data, error };
			} finally {
				isLoadingSignal.value = false;
			}
		},

		async logout() {
			isLoadingSignal.value = true;
			try {
				await authClient.signOut();
				batch(() => {
					sessionSignal.value = null;
					userSignal.value = null;
				});
			} finally {
				isLoadingSignal.value = false;
			}
		},
	};
});

// Exportamos la instancia única (Singleton) usando el nuevo nombre
export const authStore = new createAuthStore();
