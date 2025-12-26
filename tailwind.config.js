/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./components/**/*.{vue,js,ts}",
		"./layouts/**/*.vue",
		"./pages/**/*.vue",
		"./composables/**/*.{js,ts}",
		"./app.vue",
		"./nuxt.config.ts",
	],
	safelist: [
		// Game type icon colors - ensure all color variants are included
		'text-blue-600', 'text-blue-500', 'bg-blue-100', 'dark:bg-blue-900/20', 'border-blue-200', 'dark:border-blue-800',
		'text-red-600', 'text-red-500', 'bg-red-100', 'dark:bg-red-900/20', 'border-red-200', 'dark:border-red-800',
		'text-purple-600', 'text-purple-500', 'bg-purple-100', 'dark:bg-purple-900/20', 'border-purple-200', 'dark:border-purple-800',
		'text-cyan-600', 'text-cyan-500', 'bg-cyan-100', 'dark:bg-cyan-900/20', 'border-cyan-200', 'dark:border-cyan-800',
		'text-indigo-600', 'text-indigo-500', 'bg-indigo-100', 'dark:bg-indigo-900/20', 'border-indigo-200', 'dark:border-indigo-800',
		'text-pink-600', 'text-pink-500', 'bg-pink-100', 'dark:bg-pink-900/20', 'border-pink-200', 'dark:border-pink-800',
		'text-rose-600', 'text-rose-500', 'bg-rose-100', 'dark:bg-rose-900/20', 'border-rose-200', 'dark:border-rose-800',
		'text-orange-600', 'text-orange-500', 'bg-orange-100', 'dark:bg-orange-900/20', 'border-orange-200', 'dark:border-orange-800',
	],
	theme: {
		extend: {},
	},
	plugins: [require("@tailwindcss/typography")],
};
