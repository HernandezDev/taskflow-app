import type { D1Database } from "@cloudflare/workers-types";

export type Bindings = {
	DB: D1Database;
	BETTER_AUTH_SECRET: string;
	FRONTEND_URL: string;
	ASSETS: Fetcher; // Necesario para servir tu frontend estático
};

export type AppEnv = {
	Bindings: Bindings;
};
