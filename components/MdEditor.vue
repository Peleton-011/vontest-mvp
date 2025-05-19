<template>
	<ClientOnly>
		<QuillEditor
			:class="
				'w-full rounded-[calc(var(--ui-radius)*1.5)] border-0 placeholder:text-(--ui-text-dimmed)  disabled:cursor-not-allowed disabled:opacity-75 transition-colors px-2.5 py-1.5 text-sm gap-1.5 text-(--ui-text-highlighted) bg-(--ui-bg) ring ring-inset ring-(--ui-border-accented) ' +
				(props.class ? props.class : '')
			"
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
	</ClientOnly>
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
	class: String,
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
	// Delay to wait for DOM render
	nextTick(() => styleEditor());
}

// Only compute markdown when ready and content changes
function updateMarkdown() {
	if (editor.value?.getHTML) {
		const html = editor.value.getHTML();
		const turndownService = new TurndownService({
			codeBlockStyle: "fenced",
			hr: "---",
			headingStyle: "atx",
		});
		contentMarkdown.value = turndownService.turndown(html);
		console.log(turndownService.turndown("<h1> Heading </h1>"));
		emit("update:contentMarkdown", contentMarkdown.value);
	}
}

// Set the editor styling
function styleEditor() {
	if (!editor.value) return;

	const toolbar = document.querySelector(".ql-toolbar");
	const container = document.querySelector(".ql-container");
	const contentArea = container.querySelector(".ql-editor");

	// Add classes to specific child elements if needed
	const onFocus = "!outline-none !ring-2 !ring-inset !ring-(--ui-primary)";

	contentArea.addEventListener("focusin", () => {
		onFocus.split(" ").forEach((c) => container.classList.add(c));
	});

	contentArea.addEventListener("focusout", () => {
		onFocus.split(" ").forEach((c) => container.classList.remove(c));
	});

	if (contentArea) {
		contentArea.classList.add(
			"prose",
			// "text-white",
			"min-h-[500px]",
			"markdown-body"
		);
	}

	if (toolbar) {
		"bg-neutral-700 transition-colors px-2.5 py-1.5 text-sm gap-1.5 ring ring-inset ring-(--ui-border-accented) rounded-[calc(var(--ui-radius)*1.5)]"
			.split(" ")
			.forEach((c) => toolbar.classList.add(c));
	} else {
		console.log("no toolbar");
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
