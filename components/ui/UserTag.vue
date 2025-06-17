<template>
	<div>
		<UModal>
			<button>
				<img
					v-if="author.avatarUrl"
					:src="author.avatarUrl"
					class="w-6 h-6 rounded-full mr-2 hover:scale-125 transition-transform cursor-pointer"
				/>
			</button>
			<template #content>
				<div class="flex flex-col">
					<img
						v-if="author.avatarUrl"
						:src="author.avatarUrl"
						class="m-8 rounded-full hover:scale-110 transition-transform"
					/>
					<h3 class="text-center text-3xl mb-4 font-bold">
						{{ author.username }}
					</h3>
				</div>
			</template>
		</UModal>
		<span class="font-medium">{{ author.username }}</span>
	</div>
</template>

<script lang="ts" setup>
const { author } = defineProps<{
	author: { username: string; avatarUrl: string };
}>();
</script>
