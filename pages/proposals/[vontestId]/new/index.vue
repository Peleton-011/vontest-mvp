<script lang="ts" setup>
const route = useRoute();
const id = route.params.vontestId as string;
</script>
<template>
    <FormProposal :vontest-id="id"/>
</template>