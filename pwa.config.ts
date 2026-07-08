import type { VitePWAOptions } from "vite-plugin-pwa";

export const pwaOptions: Partial<VitePWAOptions> = {
	// 1. OPTIMIZACIÓN DE RENDIMIENTO (Lighthouse)
	// Carga el script en segundo plano sin pausar el renderizado principal
	injectRegister: "script-defer",

	registerType: "autoUpdate",

	workbox: {
		// Evita que el Service Worker intercepte tus peticiones al backend
		navigateFallbackDenylist: [/^\/api/],
		// 2. BUENA PRÁCTICA: Limpia cachés de versiones anteriores automáticamente
		cleanupOutdatedCaches: true,

		// 🚀 3. ESTRATEGIA NETWORK FIRST (Garantiza actualizaciones automáticas)
		// Evitamos que Vite precachee el index.html de forma estática
		globIgnores: ["**/index.html"],
		// Desactivamos el fallback genérico para controlarlo nosotros
		navigateFallback: null,

		// Configuramos cómo manejará la red en tiempo real
		runtimeCaching: [
			{
				// Regla A: El documento HTML (Navegación)
				// Intenta la red primero; si tarda más de 3s o falla, usa la caché
				urlPattern: ({ request }) => request.mode === "navigate",
				handler: "NetworkFirst",
				options: {
					cacheName: "html-cache",
					networkTimeoutSeconds: 3,
					expiration: {
						maxEntries: 1, // Solo un index.html
						maxAgeSeconds: 60 * 60 * 24 * 7, // Expira en 7 días sin red
					},
				},
			},
			{
				// Regla B: Assets estáticos (JS, CSS, Imágenes)
				// Muestra la versión cacheada al instante, pero descarga la nueva en segundo plano
				urlPattern: ({ request }) =>
					request.destination === "script" ||
					request.destination === "style" ||
					request.destination === "image",
				handler: "StaleWhileRevalidate",
				options: {
					cacheName: "assets-cache",
					expiration: {
						maxEntries: 100,
						maxAgeSeconds: 60 * 60 * 24 * 30, // Expira en 30 días
					},
				},
			},
		],
	},

	manifest: {
		name: "Hono SPA Template",
		short_name: "Hono SPA",
		description:
			"Plantilla Fullstack: Hono en backend, Preact en el cliente y Vite 8 de orquestador",
		theme_color: "#E36002",
		background_color: "#ffffff",
		display: "standalone",
		icons: [
			{
				src: "/logo-192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/logo-512.png",
				sizes: "512x512",
				type: "image/png",
			},
			{
				src: "/logo-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "any maskable",
			},
		],
	},
};
