<script setup lang="ts">
import Editorjs from "~/components/editorjs/Editorjs.vue";

const editorContent = ref(""); // this will hold Editor.js output

// Optional: Save to backend or log output
const saveContent = () => {
	console.log("Editor Data:", editorContent.value);
};
</script>

<template>
	<div class="p-6 max-w-3xl mx-auto">
		<ClientOnly>
			<Editorjs
				v-model="editorContent"
				placeholder="Write your ideas here..."
			/>
		</ClientOnly>
		<UButton @click="saveContent" class="mt-4">Save</UButton>
	</div>
</template>
