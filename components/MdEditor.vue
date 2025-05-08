<script setup lang="ts">
const initialData = {
  name: 'Wall-E',
  location: 'Earth',
  // `about` is a Delta object
  // Learn more at: https://quilljs.com/docs/delta
  about: [
    {
      insert:
        'A robot who has developed sentience, and is the only robot of his kind shown to be still functioning on Earth.\n',
    },
  ],
};

const quill = new Quill('#editor', {
  modules: {
    toolbar: [
      ['bold', 'italic'],
      ['link', 'blockquote', 'code-block', 'image'],
      [{ list: 'ordered' }, { list: 'bullet' }],
    ],
  },
  theme: 'snow',
});

const resetForm = () => {
  quill.setContents(initialData.about);
};

resetForm();

const form = document.querySelector('form');
const submit =  (event) => {
  // Append Quill content before submitting
  event.formData.append('about', JSON.stringify(quill.getContents().ops));
};

</script>
<template>
    <link href="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css" rel="stylesheet" />

    <div id="editor"></div>
    <button @click="submit">Submit</button>

    <script src="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js"></script>
</template>