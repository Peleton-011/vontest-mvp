<script lang="ts" setup>
const route = useRoute();
const id = route.params.id as string;
</script>
<template>
    <FormProposal :vontestId="id"/>
</template>