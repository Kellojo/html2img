<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { MediaQuery } from 'svelte/reactivity';
	import ImageIcon from '@lucide/svelte/icons/image';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from '$lib/components/ui/button/index.js';
	import { authClient } from '$lib/auth-client.js';

	interface SidebarUser {
		name: string;
		email: string;
	}

	let { user, onclose }: { user: SidebarUser; onclose: () => void } = $props();

	const isMobile = new MediaQuery('(max-width: 767px)');

	function handleNavigate() {
		if (isMobile.current) onclose();
	}

	async function signOut() {
		await authClient.signOut();
		await invalidateAll();
		goto(resolve('/login'));
	}

	const initials = $derived(
		user.name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part: string) => part[0]?.toUpperCase() ?? '')
			.join('')
	);

	const navItems = [
		{ href: '/', label: 'Export configs', icon: ImageIcon },
		{ href: '/api-keys', label: 'API keys', icon: KeyRoundIcon }
	] as const;
</script>

<aside class="bg-muted/30 flex h-full w-72 shrink-0 flex-col border-r">
	<div class="flex items-center justify-between gap-2 p-3">
		<div class="flex min-w-0 items-center gap-2">
			<span
				class="bg-foreground text-background flex size-5 shrink-0 items-center justify-center rounded-md"
				aria-hidden="true"
			>
				<ImageIcon class="size-3.5" />
			</span>
			<span class="px-1 text-sm font-semibold">HTML2IMG</span>
		</div>
		<Button variant="ghost" size="sm" onclick={() => onclose()} aria-label="Close sidebar">
			<XIcon class="size-4" />
		</Button>
	</div>

	<nav class="flex-1 overflow-y-auto px-2 pb-2">
		<p class="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium">Workspace</p>
		{#each navItems as item (item.href)}
			<a
				href={resolve(item.href)}
				onclick={handleNavigate}
				class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm {page.url.pathname ===
				item.href
					? 'bg-accent text-accent-foreground'
					: 'text-muted-foreground hover:bg-accent/50'}"
			>
				<item.icon class="size-4" />
				{item.label}
			</a>
		{/each}
	</nav>

	<div class="flex items-center justify-between gap-2 border-t p-3">
		<div class="flex min-w-0 items-center gap-2">
			{#if initials}
				<span
					class="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium"
				>
					{initials}
				</span>
			{/if}
			<span class="min-w-0 truncate text-sm" title={user.email}>{user.name}</span>
		</div>
		<div class="flex shrink-0 gap-1">
			<Button variant="ghost" size="icon" onclick={signOut} aria-label="Sign out" title="Sign out">
				<LogOutIcon class="size-4" />
			</Button>
		</div>
	</div>
</aside>
