import type { D1Database, Fetcher } from "@cloudflare/workers-types";
import type { Session, User } from "better-auth";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { AuthType } from "./auth";
import type * as schema from "./db";

export type Bindings = {
	DB: D1Database;
	BETTER_AUTH_SECRET: string;
	FRONTEND_URL: string;
	ASSETS: Fetcher;
};

export type AppEnv = {
	Bindings: Bindings;
	Variables: {
		user: User | null;
		session: Session | null;
		db: DrizzleD1Database<typeof schema>;
		auth: AuthType;
	};
};
