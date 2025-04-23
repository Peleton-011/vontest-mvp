<script setup>

    const user = useSupabaseUser()
</script>

<template>
    <div>
        <h1>Home Page</h1>

        {{ user ? user.id : 'not logged in' }}
    </div>
</template>