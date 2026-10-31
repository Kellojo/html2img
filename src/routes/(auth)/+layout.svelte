<script lang="ts">
	import type { Snippet } from 'svelte';
	import ImageIcon from '@lucide/svelte/icons/image';

	let { children }: { children: Snippet } = $props();
</script>

<main class="bg-background flex min-h-dvh flex-col items-center justify-center p-6">
	<div class="flex w-full max-w-sm flex-col items-center gap-6">
		<div class="flex items-center gap-2.5">
			<span
				class="bg-foreground text-background flex size-6 shrink-0 items-center justify-center rounded-lg"
				aria-hidden="true"
			>
				<ImageIcon class="size-4" />
			</span>
			<span class="text-base font-semibold tracking-tight">HTML2IMG</span>
		</div>
		{@render children()}
	</div>
</main>
