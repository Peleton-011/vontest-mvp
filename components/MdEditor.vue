<script setup>
import {
	ref,
	onMounted,
	onBeforeUnmount,
	watch,
	defineProps,
	defineEmits,
} from "vue";

const props = defineProps({
	modelValue: {
		type: Object,
		default: () => ({ blocks: [] }),
	},
	showOutput: {
		type: Boolean,
		default: false,
	},
});

const emit = defineEmits(["update:modelValue"]);

const editorRef = ref();
let editorInstance = null;

const initEditor = async () => {
	const EditorJS = (await import("@editorjs/editorjs")).default;
	const Header = (await import("@editorjs/header")).default;
	const ImageTool = (await import("@editorjs/image")).default;
	const Delimiter = (await import("@editorjs/delimiter")).default;
	const List = (await import("@editorjs/list")).default;
	const Checklist = (await import("@editorjs/checklist")).default;
	const Quote = (await import("@editorjs/quote")).default;
	const CodeTool = (await import("@editorjs/code")).default;
	const Embed = (await import("@editorjs/embed")).default;
	const Table = (await import("@editorjs/table")).default;
	const LinkTool = (await import("@editorjs/link")).default;
	const Warning = (await import("@editorjs/warning")).default;
	const Marker = (await import("@editorjs/marker")).default;
	const InlineCode = (await import("@editorjs/inline-code")).default;

	editorInstance = new EditorJS({
		holder: editorRef.value,
		data: props.modelValue,
		tools: {
            //  Check out all the tools at https://github.com/codex-team/editor.js?tab=readme-ov-file
			paragraph: {
				config: {
					placeholder: "Escribe algo...",
				},
			},
			header: {
				class: Header,
				inlineToolbar: ["link"],
				shortcut: "CMD+SHIFT+H",
			},
			// image: ImageTool,
			/* 
            
            Check out https://www.npmjs.com/package/@editorjs/image to make it work.
            Add arbitrary file uploads too
            
            */
			list: { class: List, inlineToolbar: true, shortcut: "CMD+SHIFT+L" },
			checklist: { class: Checklist, inlineToolbar: true },
			quote: {
				class: Quote,
				inlineToolbar: true,
				config: {
					quotePlaceholder: "Introduce una cita",
					captionPlaceholder: "Autor de la cita",
				},
				shortcut: "CMD+SHIFT+O",
			},
			warning: Warning,
			marker: { class: Marker, shortcut: "CMD+SHIFT+M" },
			code: { class: CodeTool, shortcut: "CMD+SHIFT+C" },
			delimiter: Delimiter,
			inlineCode: { class: InlineCode, shortcut: "CMD+SHIFT+C" },
			// linkTool: LinkTool,
			/*
            Check out https://github.com/editor-js/link
            */
			embed: Embed,
			table: { class: Table, inlineToolbar: true, shortcut: "CMD+ALT+T" },
		},
		onChange: async () => {
			const data = await editorInstance.save();
			emit("update:modelValue", data);
		},
	});
};

onMounted(() => {
	initEditor();
});

onBeforeUnmount(() => {
	if (editorInstance && typeof editorInstance.destroy === "function") {
		editorInstance.destroy();
	}
});
</script>

<template>
	<div class="p-6 max-w-4xl mx-auto">
		<div
			ref="editorRef"
			class="rounded p-4 !bg-neutral-800 markdown-body"
		></div>
		<div v-if="showOutput" class="mt-4">
			<h3 class="text-lg font-semibold">Contenido guardado:</h3>
			<pre class="rounded bg-neutral-800 p-2 text-sm overflow-auto"
				>{{ JSON.stringify(modelValue, null, 2) }}
      </pre
			>
		</div>
	</div>
</template>
