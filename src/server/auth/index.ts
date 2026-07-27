import type { D1Database } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db";

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
				// 🛡️ Web Crypto API Nativo: Operaciones asíncronas delegadas al hardware
				hash: async (password: string) => {
					const encoder = new TextEncoder();
					const salt = crypto.getRandomValues(new Uint8Array(16));

					// Importación del material clave
					const keyMaterial = await crypto.subtle.importKey(
						"raw",
						encoder.encode(password),
						{ name: "PBKDF2" },
						false,
						["deriveBits"],
					);

					// Derivación segura off-thread (Cero bloqueo de CPU en JS)
					const hashBuffer = await crypto.subtle.deriveBits(
						{ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
						keyMaterial,
						256,
					);

					// Formateo para persistencia en base de datos
					const saltHex = Array.from(salt)
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");
					const hashHex = Array.from(new Uint8Array(hashBuffer))
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");
					return `${saltHex}:${hashHex}`;
				},
				verify: async ({ password, hash }: { password: string; hash: string }) => {
					// 1. Validar formato básico
					const [saltHex, originalHash] = hash.split(":");
					if (!saltHex || !originalHash) return false;

					// 2. Linter Fix: Zero Trust sobre la estructura del string
					const matchArray = saltHex.match(/.{1,2}/g);
					if (!matchArray) return false; // Fail-fast si la estructura hexadecimal está corrupta

					// 3. Conversión segura
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
						{ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
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
