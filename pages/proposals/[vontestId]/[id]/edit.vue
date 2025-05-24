<script setup lang="ts">
const route = useRoute();

const vontestId = route.params.vontestId as string;
const id = route.params.id as string;

</script>
<template>
	<FormProposal :vontest-id="vontestId" :proposal-id="id" />
</template>
