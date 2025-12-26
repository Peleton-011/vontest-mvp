<template>
	<div class="space-y-4">
		<!-- Current Image Preview -->
		<div v-if="modelValue || preview" class="flex items-center gap-4">
			<UAvatar
				:src="preview || modelValue"
				:alt="alt"
				size="2xl"
			/>
			<div class="flex-1">
				<p class="text-sm font-medium">Current Image</p>
				<p v-if="modelValue" class="text-xs text-gray-500 truncate">{{ modelValue }}</p>
			</div>
			<UButton
				v-if="modelValue || preview"
				color="error"
				variant="ghost"
				icon="i-heroicons-x-mark"
				size="sm"
				@click="handleRemove"
			>
				Remove
			</UButton>
		</div>

		<!-- Upload Options -->
		<div class="space-y-3">
			<!-- File Upload -->
			<div>
				<label
					class="block w-full cursor-pointer"
					:class="{ 'opacity-50 cursor-not-allowed': disabled || uploading }"
				>
					<div
						class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:border-primary-500 transition-colors"
					>
						<UIcon
							name="i-heroicons-cloud-arrow-up"
							class="w-12 h-12 mx-auto mb-3 text-gray-400"
						/>
						<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
							{{ uploading ? 'Uploading...' : 'Click to upload an image' }}
						</p>
						<p class="text-xs text-gray-500 mt-1">
							PNG, JPG, GIF up to 5MB
						</p>
					</div>
					<input
						ref="fileInput"
						type="file"
						accept="image/*"
						class="hidden"
						:disabled="disabled || uploading"
						@change="handleFileChange"
					>
				</label>
			</div>

			<!-- Or URL Input -->
			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-gray-300 dark:border-gray-700"></div>
				</div>
				<div class="relative flex justify-center text-xs">
					<span class="px-2 bg-white dark:bg-gray-900 text-gray-500">Or enter a URL</span>
				</div>
			</div>

			<UFormField label="Image URL">
				<UInput
					:model-value="modelValue"
					placeholder="https://example.com/image.png"
					:disabled="disabled || uploading"
					@update:model-value="handleUrlChange"
				/>
			</UFormField>
		</div>

		<!-- Upload Error -->
		<UAlert
			v-if="uploadError"
			color="error"
			variant="soft"
			:title="uploadError"
			:close-button="{ icon: 'i-heroicons-x-mark', color: 'error', variant: 'ghost' }"
			@close="uploadError = null"
		/>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	modelValue: string;
	disabled?: boolean;
	alt?: string;
	bucket?: string; // Supabase storage bucket name
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const fileInput = ref<HTMLInputElement | null>(null);
const preview = ref<string>('');
const uploading = ref(false);
const uploadError = ref<string | null>(null);

// Handle file selection
const handleFileChange = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];

	if (!file) return;

	// Validate file size (5MB max)
	if (file.size > 5 * 1024 * 1024) {
		uploadError.value = 'File size must be less than 5MB';
		return;
	}

	// Validate file type
	if (!file.type.startsWith('image/')) {
		uploadError.value = 'Please upload an image file';
		return;
	}

	uploadError.value = null;

	// Create preview
	const reader = new FileReader();
	reader.onload = (e) => {
		preview.value = e.target?.result as string;
	};
	reader.readAsDataURL(file);

	// Upload to Supabase Storage if bucket is specified
	if (props.bucket && user.value) {
		uploading.value = true;

		try {
			const fileExt = file.name.split('.').pop();
			const fileName = `${user.value.id}-${Date.now()}.${fileExt}`;
			const filePath = `${fileName}`;

			const { data, error } = await supabase.storage
				.from(props.bucket)
				.upload(filePath, file, {
					cacheControl: '3600',
					upsert: true,
				});

			if (error) {
				throw error;
			}

			// Get public URL
			const { data: urlData } = supabase.storage
				.from(props.bucket)
				.getPublicUrl(filePath);

			emit('update:modelValue', urlData.publicUrl);
			preview.value = '';
		} catch (error: any) {
			console.error('Upload error:', error);
			uploadError.value = error.message || 'Failed to upload image';
			preview.value = '';
		} finally {
			uploading.value = false;
		}
	} else {
		// If no bucket specified, just use the preview as a data URL
		emit('update:modelValue', preview.value);
	}

	// Reset file input
	if (fileInput.value) {
		fileInput.value.value = '';
	}
};

// Handle URL input
const handleUrlChange = (value: string) => {
	uploadError.value = null;
	preview.value = '';
	emit('update:modelValue', value);
};

// Handle remove
const handleRemove = () => {
	preview.value = '';
	emit('update:modelValue', '');
	uploadError.value = null;
};
</script>
