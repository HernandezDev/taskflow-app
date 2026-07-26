import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
	const auth = c.get("auth");
	const session = await auth.api.getSession({ headers: c.req.raw.headers });

	if (!session?.user) {
		return c.json({ success: false, error: "No autorizado" }, 401);
	}

	c.set("user", session.user);
	c.set("session", session.session);
	await next();
};
