import type { VitePWAOptions } from "vite-plugin-pwa";

export const pwaOptions: Partial<VitePWAOptions> = {
	registerType: "autoUpdate",
	workbox: {
		navigateFallbackDenylist: [/^\/api/],
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
