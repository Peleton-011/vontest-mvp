<script setup>
import { ref, onMounted } from "vue";
import MdEditor from "~/components/MdEditor.vue";

const quillRef = ref();
const content = ref();
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

const text = ref(null);
const textChild = ref(null);

onMounted(async () => {
	console.log("boutta truncate");
	console.log(text.value);
	if (!text.value || !textChild.value) return;
	console.log("almost truncatin");
	useTruncateText(
		text.value,
		textChild.value,
		4,
		"show less.",
		"... show more"
	);
});

function handleSelectionChange(r) {
	range.value = r;
}

function handleTextChange(delta) {
	lastChange.value = delta;
}

function getContentLength() {
	const len = quillRef.value?.getLength?.();
	alert(len ?? "Quill instance not ready");
}

const comment = ref("");

// :handle="false"
</script>

<template>
	<div>
		<UDrawer
			:overlay="false"
			:modal="false"
			should-scale-background
			:set-background-color-on-scale="false"
			inset
		>
			<UButton
				label="Open"
				color="neutral"
				variant="subtle"
				trailing-icon="i-lucide-chevron-up"
			/>

			<template #content>
				<div class="p-4 grid grid-cols-3">
					<div class="col-span-2">
						<ClientOnly>
							<!-- class="w-full rounded-[calc(var(--ui-radius)*1.5)] border-0 placeholder:text-(--ui-text-dimmed) focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 transition-colors px-2.5 py-1.5 text-sm gap-1.5 text-(--ui-text-highlighted) bg-(--ui-bg) ring ring-inset ring-(--ui-border-accented) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[--ui-primary]" -->
							<MdEditor
								id="description"
								v-model="comment.value"
							/>
						</ClientOnly>
					</div>
                    <div class="col-span-1">
                        <Placeholder />
                    </div>
				</div>
			</template>
		</UDrawer>

		<div v-if="false">
			<div>
				<p ref="test">
					<span ref="testChild"
						>Very long text should be truncate use js. Very long
						text should be truncate.Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate.Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate use js. Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate.Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate.Very long text should be
						truncate use js. Very long text should be truncate.Very
						long text should be truncate.Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate.Very long text should be
						truncate.Very long text should be truncate use js. Very
						long text should be truncate.Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate.Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate use js. Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate.Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate.Very long text should be
						truncate use js. Very long text should be truncate.Very
						long text should be truncate.Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate.Very long text should be
						truncate.Very long text should be truncate use js. Very
						long text should be truncate.Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate.Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate use js. Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate.Very long text should be
						truncate.Very long text should be truncate.Very long
						text should be truncate.</span
					>
				</p>

				<ClientOnly>
					<MdEditor
						v-if="content"
						ref="quillRef"
						v-model="content"
						v-model:content-markdown="contentMarkdown"
						:read-only="false"
						@selection-change="handleSelectionChange"
						@text-change="handleTextChange"
					/>
				</ClientOnly>
				<hr />
				<ClientOnly>
					<MdEditor
						v-if="content"
						ref="quillRef"
						v-model="content"
						v-model:content-markdown="contentMarkdown"
						:read-only="false"
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
						{{
							lastChange
								? JSON.stringify(lastChange.ops)
								: "Empty"
						}}
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
