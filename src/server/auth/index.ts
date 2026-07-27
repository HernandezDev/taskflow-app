import type { D1Database } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db";

// Iteraciones de PBKDF2, mínimo recomendado por OWASP para HMAC-SHA256 (2026).
// Subir este número si el hardware de ataque mejora; ver Password Storage Cheat Sheet.
const PBKDF2_ITERATIONS = 600_000;

export const createAuth = (config: { database: D1Database; secret: string; baseURL: string }) => {
	const db = drizzle(config.database, { schema });

	return betterAuth({
		baseURL: config.baseURL,
		secret: config.secret,
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema,
		}),
		advanced: {
			ipAddress: { ipAddressHeaders: ["CF-Connecting-IP"] },
		},
		emailAndPassword: {
			enabled: true,
			password: {
				// PBKDF2 vía Web Crypto API. Es async (no bloquea el event loop),
				// pero sigue consumiendo CPU real y cuenta contra el cpuTime
				// facturado por Cloudflare — medido empíricamente, no es "gratis".
				hash: async (password: string) => {
					const encoder = new TextEncoder();
					const salt = crypto.getRandomValues(new Uint8Array(16));

					const keyMaterial = await crypto.subtle.importKey(
						"raw",
						encoder.encode(password),
						{ name: "PBKDF2" },
						false,
						["deriveBits"],
					);

					const hashBuffer = await crypto.subtle.deriveBits(
						{ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
						keyMaterial,
						256,
					);

					const saltHex = Array.from(salt)
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");
					const hashHex = Array.from(new Uint8Array(hashBuffer))
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");
					return `${saltHex}:${hashHex}`;
				},
				verify: async ({ password, hash }: { password: string; hash: string }) => {
					const [saltHex, originalHash] = hash.split(":");
					if (!saltHex || !originalHash) return false;

					const matchArray = saltHex.match(/.{1,2}/g);
					if (!matchArray) return false;

					const salt = new Uint8Array(matchArray.map((byte) => parseInt(byte, 16)));
					const encoder = new TextEncoder();

					const keyMaterial = await crypto.subtle.importKey(
						"raw",
						encoder.encode(password),
						{ name: "PBKDF2" },
						false,
						["deriveBits"],
					);

					const hashBuffer = await crypto.subtle.deriveBits(
						{ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
						keyMaterial,
						256,
					);

					const newHashHex = Array.from(new Uint8Array(hashBuffer))
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");

					return newHashHex === originalHash;
				},
			},
		},
	});
};

export type AuthType = ReturnType<typeof createAuth>;
