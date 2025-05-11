<script setup>
import { onMounted, onBeforeUnmount, watch, ref } from "vue";
import Quill from "quill";

const props = defineProps({
	readOnly: Boolean,
	defaultValue: Object,
	onTextChange: Function,
	onSelectionChange: Function,
});

const editorRef = ref(null);
const quillRef = ref(null);

watch(
	() => props.readOnly,
	(newVal) => {
		if (quillRef.value) {
			quillRef.value.enable(!newVal);
		}
	}
);

onMounted(() => {
	if (!editorRef.value) return;
	if (!document) return;
	const editorEl = document.createElement("div");
	editorRef.value.appendChild(editorEl);

	const quill = new Quill(editorEl, {
		theme: "snow",
	});
	quillRef.value = quill;

	if (props.defaultValue) {
		quill.setContents(props.defaultValue);
	}

	if (props.onTextChange) {
		quill.on("text-change", (...args) => {
			props.onTextChange(...args);
		});
	}

	if (props.onSelectionChange) {
		quill.on("selection-change", (...args) => {
			props.onSelectionChange(...args);
		});
	}
});

onBeforeUnmount(() => {
	quillRef.value = null;
	if (editorRef.value) editorRef.value.innerHTML = "";
});

defineExpose({ quill: quillRef });
</script>

<template>
	<div ref="editorRef"></div>
</template>
