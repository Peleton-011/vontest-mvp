<script lang="ts" setup>
import EditorJS from "@editorjs/editorjs";

const editor = new EditorJS();
</script>
<template>
	<ClientOnly>
        <MdEditor />
	</ClientOnly>
</template>
