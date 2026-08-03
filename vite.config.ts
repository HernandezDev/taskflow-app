import build from "@hono/vite-build/cloudflare-pages";
import devServer, { defaultOptions } from "@hono/vite-dev-server";
import adapter from "@hono/vite-dev-server/cloudflare";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
	// ---------------------------------------------------------
	// PASO 2: Construcción del Backend (Hono a _worker.js)
	// ---------------------------------------------------------
	if (mode === "server") {
		return {
			build: {
				emptyOutDir: false,
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
		plugins: [
			tailwindcss(),
			preact(),
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
