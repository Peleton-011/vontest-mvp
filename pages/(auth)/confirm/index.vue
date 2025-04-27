<script setup>
const supabase = useSupabaseClient();
const router = useRouter();

// Function to resend confirmation email
const resendConfirmation = async () => {
	const { data, error } = await supabase.auth.resend({ type: "signup" });

	if (error) {
		alert("Error sending confirmation email: " + error.message);
	} else {
		alert("A new confirmation email has been sent to your inbox.");
	}
};
</script>

<template>
	<section
		class="flex flex-col items-center min-h-screen bg-neutral-900 text-white mt-8"
	>
		<u-card class="max-w-lg mx-auto p-6 bg-neutral-800 rounded-lg">
			<h1 class="text-3xl font-semibold text-neutral-100">
				Check Your Email
			</h1>
			<p class="mt-4 text-lg text-neutral-400">
				We've sent a confirmation link to your email address. Please
				check your inbox and click the link to confirm your email
				address.
			</p>

			<p class="mt-4 text-lg text-neutral-400">
				Didn't receive the email? Please check your spam folder, or
				click the button below to resend the confirmation email.
			</p>

			<div class="mt-6">
				<!-- Resend Confirmation Button -->
				<u-button
					size="lg"
					block
					@click="resendConfirmation"
					class="font-bold"
				>
					Resend Confirmation Email
					<u-icon name="i-lucide-refresh-ccw" class="ml-2" />
				</u-button>
			</div>
		</u-card>
	</section>
</template>
