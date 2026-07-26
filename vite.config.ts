import build from "@hono/vite-build/cloudflare-pages";
import devServer, { defaultOptions } from "@hono/vite-dev-server";
import adapter from "@hono/vite-dev-server/cloudflare";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { pwaOptions } from "./pwa.config"; // <-- 1. Importamos tu configuración aislada

// 🛡️ Condiciones de resolución SSR alineadas con el runtime real (workerd),
// escopeadas solo al código de servidor — no afecta el bundle de cliente.
const workerdSsrConditions = ["workerd", "node", "import", "module"];

export default defineConfig(({ mode }) => {
	// ---------------------------------------------------------
	// PASO 2: Construcción del Backend (Hono a _worker.js)
	// ---------------------------------------------------------
	if (mode === "server") {
		return {
			build: {
				emptyOutDir: false,
			},
			ssr: {
				noExternal: true,
				resolve: {
					conditions: workerdSsrConditions,
				},
			},
			plugins: [
				build({
					entry: "src/server/index.ts",
				}),
			],
		};
	}

	// ---------------------------------------------------------
	// PASO 1 Y DESARROLLO: Construcción del Frontend y Hono Local
	// ---------------------------------------------------------
	return {
		appType: "spa",
		build: {
			outDir: "dist",
			emptyOutDir: true,
		},
		ssr: {
			resolve: {
				conditions: workerdSsrConditions,
			},
		},
		plugins: [
			tailwindcss(),
			preact(),
			VitePWA(pwaOptions),
			devServer({
				adapter,
				entry: "src/server/index.ts",
				exclude: [
					"/",
					"/index.html",
					"/src/**",
					"/@vite/**",
					"/node_modules/**",
					...defaultOptions.exclude,
					/^\/(?!api).*/, // <-- Ignora toda ruta que NO empiece con "/api" dejando que Vite resuelva el SPA
				],
				injectClientScript: true,
			}),
		],
	};
});
