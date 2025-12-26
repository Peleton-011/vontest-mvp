import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
				compatibilityDate: "2024-11-01",
				devtools: { enabled: true },

				css: ["~/assets/css/main.css"],

	runtimeConfig: {
		public: {
			siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
		},
	},

	modules: [
		"@nuxt/content",
		"@nuxt/ui",
		"@nuxt/icon",
		"@nuxt/fonts",
		"@nuxt/eslint",
		"@nuxtjs/supabase",
  	"@vueuse/nuxt",
		"@nuxtjs/ionic",
	],
	ssr: false,
	ionic: {
		css: {
			core: false,
			basic: false,
			utilities: false,
		},
	},
	supabase: {
		redirectOptions: {
			login: "/login",
			// Email confirmation disabled - redirect to home after auth
			// callback: "/confirm",
			callback: "/",
			exclude: ["/login", "/signup", "/", "/logout", "/confirm"],
		},
	},

				vite: {
								plugins: [tailwindcss()],
								build: {
												rollupOptions: {
																external: ["#supabase/server"],
												},
								},
				},

				app: {
								rootAttrs: {
												"data-vaul-drawer-wrapper": "",
								},
				},
});