<script lang="ts" setup>
const route = useRoute();
const id = route.params.vontestId as string;
</script>
<template>
    <FormProposal :vontestId="id"/>
</template>