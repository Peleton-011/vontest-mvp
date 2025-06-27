<script lang="ts" setup>
import type { Ref } from "./CommentRefs.vue";

const props = defineProps<{
	refs: Ref[];
}>();
</script>
<template>
	<ul class="list-disc list-inside text-gray-400">
		<li v-for="ref in props.refs" :key="ref.id" class="my-1">
			<UiCommentRef :reference="ref" />
		</li>
	</ul>
</template>
