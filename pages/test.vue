<template>
	<MdEditor v-model="editorContent" :showOutput="true" />
</template>

<script setup>
import { ref } from "vue";
import MdEditor from "~/components/MdEditor.vue";

const editorContent = ref({
	blocks: [{ type: "header", data: { text: "¡Hola!", level: 2 } }],
});
</script>
