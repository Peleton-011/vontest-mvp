<template>
	<QuillEditor
		ref="editor"
		v-model:content="content"
		contentType="delta"
		toolbar="full"
		:readOnly="readOnly"
		@ready="handleReady"
		@selection-change="handleSelectionChange"
		@text-change="handleTextChange"
	/>
	<!-- :modules="editorModules" -->
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { QuillEditor } from "@vueup/vue-quill";
// import BlotFormatter from "quill-blot-formatter";
// import ImageUploader from "quill-image-uploader";
import TurndownService from "turndown";
import axios from "axios";

import "@vueup/vue-quill/dist/vue-quill.snow.css";

const props = defineProps({
	readOnly: Boolean,
	modelValue: Object,
	contentMarkdown: String,
});

const emit = defineEmits([
	"update:modelValue",
	"update:contentMarkdown",
	"selection-change",
	"text-change",
]);

const content = ref(props.modelValue);
const contentMarkdown = ref("");

watch(
	() => props.modelValue,
	(val) => (content.value = val)
);
watch(content, (val) => emit("update:modelValue", val));

const editor = ref(null);
const quillInstance = ref(null);

function handleReady(editorEl) {
	// Store the underlying Quill instance
	quillInstance.value = editorEl;
	updateMarkdown();
}

// Only compute markdown when ready and content changes
function updateMarkdown() {
	if (editor.value?.getHTML) {
		const html = editor.value.getHTML();
		const turndownService = new TurndownService();
		contentMarkdown.value = turndownService.turndown(html);
		emit("update:contentMarkdown", contentMarkdown.value);
	}
}

/*
const editorModules = {
	blotFormatter: { module: BlotFormatter },
	imageUploader: {
		module: ImageUploader,
		options: {
			upload: (file) => {
				const formData = new FormData();
				formData.append("image", file);
				return axios
					.post("/upload-image", formData)
					.then((res) => res.data.url);
			},
		},
	},
};
*/

function handleSelectionChange(range) {
	emit("selection-change", range);
}

function handleTextChange(delta, oldDelta, source) {
	emit("text-change", delta, oldDelta, source);
	updateMarkdown();
}

defineExpose({
	getLength: () => quillInstance.value?.getLength?.(),
	getContents: () => quillInstance.value?.getContents?.(),
	getHTML: () => editor.value?.getHTML?.(),
	getMarkdown: () => contentMarkdown.value,
	getText: () => quillInstance.value?.getText?.(),
});
</script>
