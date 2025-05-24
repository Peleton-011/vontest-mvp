<script lang="ts" setup>
const route = useRoute();

const vontestId = route.params.vontestId as string;
const id = route.params.id as string;

const { deleteProposal } = useProposals(vontestId);

deleteProposal(id);
navigateTo("/vontests/" + vontestId);
</script>

<template>
	<h1>Deleting</h1>
</template>
