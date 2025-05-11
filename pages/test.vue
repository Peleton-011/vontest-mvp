<script setup>
import { ref, onMounted } from "vue";
import MdEditor from "~/components/MdEditor.vue";

const quillRef = ref();
const content = ref({ ops: [] });
const contentMarkdown = ref("");
const range = ref(null);
const lastChange = ref(null);

onMounted(async () => {
	const Quill = (await import("quill")).default;
	const Delta = Quill.import("delta");
	content.value = new Delta()
		.insert("Hello\n", { header: 1 })
		.insert("Some ")
		.insert("initial", { bold: true })
		.insert(" ")
		.insert("content", { underline: true })
		.insert("\n");
});

function handleSelectionChange(r) {
	range.value = r;
}

function handleTextChange(delta, oldDelta, source) {
	lastChange.value = delta;
}

function getContentLength() {
	const len = quillRef.value?.getLength?.();
	alert(len ?? "Quill instance not ready");
}
</script>

<template>
	<div>
		<ClientOnly>
            <MdEditor
            ref="quillRef"
            v-model="content"
            v-model:contentMarkdown="contentMarkdown"
            :readOnly="false"
            @selection-change="handleSelectionChange"
            @text-change="handleTextChange"
			/>
        </ClientOnly>

		<div class="controls">
			<button class="controls-right" @click="getContentLength">
				Get Content Length
			</button>
		</div>

		<div class="state">
			<div class="state-title">Current Range:</div>
			<div>{{ range ? JSON.stringify(range) : "Empty" }}</div>
		</div>

		<div class="state">
			<div class="state-title">Last Change:</div>
			<div>
				{{ lastChange ? JSON.stringify(lastChange.ops) : "Empty" }}
			</div>
		</div>

		<div class="state">
			<div class="state-title">Markdown Output:</div>
			<pre>{{ contentMarkdown }}</pre>
		</div>

		<div class="state">
			<div class="state-title">Content:</div>
			<pre>{{ JSON.stringify(content, null, 2) }}</pre>
		</div>
	</div>
</template>

<style scoped>
.controls {
	display: flex;
	border: 1px solid #ccc;
	border-top: 0;
	padding: 10px;
}

.controls-right {
	margin-left: auto;
}

.state {
	margin: 10px 0;
	font-family: monospace;
}

.state-title {
	color: #999;
	text-transform: uppercase;
}
</style>
