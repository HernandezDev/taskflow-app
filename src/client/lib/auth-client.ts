import type { AuthType } from "@server/auth";
import { createAuthClient } from "better-auth/client";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
	plugins: [inferAdditionalFields<AuthType>()],
});
