import { defineCollection, defineContentConfig, z } from "@nuxt/content";

export default defineContentConfig({
	collections: {
		docs: defineCollection({
			type: "page",
			source: "docs/*.md",
			schema: z.object({
				links: z
					.array(
						z.object({
							label: z.string(),
							icon: z.string(),
							to: z.string(),
							target: z.string().optional(),
						})
					)
					.optional(),
				date: z.string(),
			}),
		}),
		updates: defineCollection({
			type: "page",
			source: "updates/*.md",
			schema: z.object({
				links: z
					.array(
						z.object({
							label: z.string(),
							icon: z.string(),
							to: z.string(),
							target: z.string().optional(),
						})
					)
					.optional(),
				date: z.string(),
			}),
		}),
	},
});
