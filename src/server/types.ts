import type { D1Database, Fetcher } from "@cloudflare/workers-types";
import type { Session, User } from "better-auth";

export type Bindings = {
	DB: D1Database;
	BETTER_AUTH_SECRET: string;
	FRONTEND_URL: string;
	ASSETS: Fetcher;
};

// 🛡️ Contrato ampliado para el contexto de Hono
export type AppEnv = {
	Bindings: Bindings;
	Variables: {
		user: User;
		session: Session;
	};
};
