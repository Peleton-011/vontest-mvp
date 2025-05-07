<script setup>
import { onMounted, ref } from "vue";

const editorRef = ref();
const output = ref(null);

onMounted(async () => {

	const EditorJS = (await import("@editorjs/editorjs")).default;
	const Header = (await import("@editorjs/header")).default;
	const ImageTool = (await import("@editorjs/image")).default;
	const Delimiter = (await import("@editorjs/delimiter")).default;
	const List = (await import("@editorjs/list")).default;
	const Checklist = (await import("@editorjs/checklist")).default;
	const Quote = (await import("@editorjs/quote")).default;
	const CodeTool = (await import("@editorjs/code")).default;
	const Embed = (await import("@editorjs/embed")).default;
	const Table = (await import("@editorjs/table")).default;
	const LinkTool = (await import("@editorjs/link")).default;
	const Warning = (await import("@editorjs/warning")).default;
	const Marker = (await import("@editorjs/marker")).default;
	const InlineCode = (await import("@editorjs/inline-code")).default;

	const editor = new EditorJS({
		holder: editorRef.value,
		tools: {
			paragraph: {
				config: {
					placeholder: "Escribe algo...",
				},
			},
			header: {
				class: Header,
				inlineToolbar: ["link"],
				shortcut: "CMD+SHIFT+H",
			},
			image: ImageTool,
			list: { class: List, inlineToolbar: true, shortcut: "CMD+SHIFT+L" },
			checklist: { class: Checklist, inlineToolbar: true },
			quote: {
				class: Quote,
				inlineToolbar: true,
				config: {
					quotePlaceholder: "Introduce una cita",
					captionPlaceholder: "Autor de la cita",
				},
				shortcut: "CMD+SHIFT+O",
			},
			warning: Warning,
			marker: { class: Marker, shortcut: "CMD+SHIFT+M" },
			code: { class: CodeTool, shortcut: "CMD+SHIFT+C" },
			delimiter: Delimiter,
			inlineCode: { class: InlineCode, shortcut: "CMD+SHIFT+C" },
			linkTool: LinkTool,
			embed: Embed,
			table: { class: Table, inlineToolbar: true, shortcut: "CMD+ALT+T" },
		},
		i18n: {
			messages: {
				ui: {
					blockTunes: {
						toggler: {
							"Click to tune": "Haz clic para ajustar",
							"or drag to move": "o arrastra para mover",
						},
					},
					inlineToolbar: {
						converter: {
							"Convert to": "Convertir a",
						},
					},
					toolbar: {
						toolbox: {
							Add: "Añadir",
						},
					},
					popover: {
						Filter: "Buscar",
						"Nothing found": "No se encontró nada",
					},
				},
				toolNames: {
					Text: "Párrafo",
					Heading: "Encabezado",
					List: "Lista",
					Warning: "Advertencia",
					Checklist: "Lista de tareas",
					Quote: "Cita",
					Code: "Código",
					Delimiter: "Separador",
					"Raw HTML": "HTML",
					Table: "Tabla",
					Link: "Enlace",
					Marker: "Marcador",
					Bold: "Negrita",
					Italic: "Cursiva",
					InlineCode: "Código inline",
					Image: "Imagen",
				},
				tools: {
					warning: { Title: "Título", Message: "Mensaje" },
					link: { "Add a link": "Añadir enlace" },
					stub: {
						"The block can not be displayed correctly.":
							"No se puede mostrar el bloque.",
					},
					image: {
						Caption: "Subtítulo",
						"Select an Image": "Selecciona una imagen",
						"With border": "Con borde",
						"Stretch image": "Estirar imagen",
						"With background": "Con fondo",
					},
					code: { "Enter a code": "Introduce un código" },
					linkTool: {
						Link: "Enlace",
						"Couldn't fetch the link data":
							"No se pudieron obtener los datos del enlace",
						"Couldn't get this link data, try the other one":
							"Prueba con otro enlace",
						"Wrong response format from the server":
							"Formato de respuesta inválido del servidor",
					},
					header: { Header: "Encabezado" },
					paragraph: { "Enter something": "Escribe algo" },
					list: { Ordered: "Ordenada", Unordered: "Desordenada" },
				},
				blockTunes: {
					delete: { Delete: "Eliminar" },
					moveUp: { "Move up": "Mover arriba" },
					moveDown: { "Move down": "Mover abajo" },
				},
			},
		},
		data: {
			blocks: [
				{
					type: "header",
					data: { text: "Editor.js en Nuxt", level: 2 },
				},
				{
					type: "paragraph",
					data: {
						text: "Este es un editor rich text integrado con soporte para internacionalización en español.",
					},
				},
			],
		},
		onReady: () =>
			editor
				.save()
				.then((data) => (output.value = JSON.stringify(data, null, 2))),
	});
});
</script>

<template>
	<div class="p-6 max-w-4xl mx-auto">
		<div ref="editorRef" class="border rounded p-4 bg-neutral-800"></div>
		<div class="mt-4">
			<h3 class="text-lg font-semibold">Contenido guardado:</h3>
			<pre class="bg-neutral-800 p-2 text-sm overflow-auto">{{
				output
			}}</pre>
		</div>
	</div>
</template>
