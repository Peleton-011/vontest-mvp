<script lang="ts" setup>
const route = useRoute();

const vontestId = route.params.id as string;

const { deleteVontest } = useVontests();

deleteVontest(vontestId);
navigateTo("/dashboard");
</script>

<template>
	<h1>Deleting</h1>
</template>
