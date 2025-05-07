import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	compatibilityDate: "2024-11-01",
	devtools: { enabled: true },

	css: ["~/assets/css/main.css"],

	modules: [
        '@nuxt/content',
		"@nuxt/ui",
		"@nuxt/icon",
		"@nuxt/fonts",
		"@nuxt/eslint",
		"@nuxtjs/supabase",
	],
	supabase: {
		redirectOptions: {
			login: "/login",
			callback: "/confirm",
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
});
