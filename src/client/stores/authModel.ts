import type { ReadonlySignal } from "@preact/signals-core"; // Importación corregida
import { computed, createModel, signal } from "@preact/signals-core";
import { authClient } from "../lib/auth-client";

type User = typeof authClient.$Infer.Session.user;
type Session = typeof authClient.$Infer.Session.session;

interface AuthStore {
	user: ReadonlySignal<User | null>;
	session: ReadonlySignal<Session | null>;
	isAuthenticated: ReadonlySignal<boolean>;
	isPending: ReadonlySignal<boolean>;

	checkSession(): Promise<void>;
	// Usamos unknown en lugar de any para mayor seguridad
	login(email: string, password: string): Promise<{ data: unknown; error: unknown }>;
	signUp(email: string, password: string, name: string): Promise<{ data: unknown; error: unknown }>;
	logout(): Promise<void>;
}

export const authStore = createModel<AuthStore>(() => {
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
			const { data } = await authClient.getSession();
			sessionSignal.value = data?.session ?? null;
			userSignal.value = data?.user ?? null;
			isLoadingSignal.value = false;
		},

		async login(email, password) {
			isLoadingSignal.value = true;
			const { data, error } = await authClient.signIn.email({ email, password });

			if (!error) {
				await this.checkSession();
			}

			isLoadingSignal.value = false;
			return { data, error };
		},

		async signUp(email, password, name) {
			isLoadingSignal.value = true;
			const { data, error } = await authClient.signUp.email({ email, password, name });
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
	};
});
