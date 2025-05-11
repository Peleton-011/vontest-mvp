<script setup>
import { ref } from "vue";
import MdEditor from "~/components/MdEditor.vue";
import Quill from "quill";

const Delta = Quill.import("delta");

// State equivalents
const readOnly = ref(false);
const range = ref(null);
const lastChange = ref(null);

// Quill editor instance
const quillRef = ref(null);

// Initial content
const defaultValue = new Delta()
	.insert("Hello")
	.insert("\n", { header: 1 })
	.insert("Some ")
	.insert("initial", { bold: true })
	.insert(" ")
	.insert("content", { underline: true })
	.insert("\n");

// Handlers
function handleSelectionChange(r) {
	range.value = r;
}

function handleTextChange(delta, oldDelta, source) {
	lastChange.value = delta;
}
</script>

<template>
	<div>
		<ClientOnly>

            <MdEditor
            :ref="(el) => (quillRef.value = el)"
            :readOnly="readOnly"
            :defaultValue="defaultValue"
            :onSelectionChange="handleSelectionChange"
            :onTextChange="handleTextChange"
			/>
        </ClientOnly>

		<div class="controls">
			<label>
				Read Only:
				<input
					type="checkbox"
					:checked="readOnly"
					@change="readOnly = $event.target.checked"
				/>
			</label>

			<button
				class="controls-right"
				type="button"
				@click="() => alert(quillRef.value?.getLength?.())"
			>
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
