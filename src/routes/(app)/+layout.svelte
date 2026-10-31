<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import Sidebar from '$lib/components/app/Sidebar.svelte';
	import PanelLeftIcon from '@lucide/svelte/icons/panel-left';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const isDesktop = new MediaQuery('(min-width: 768px)');

	let sidebarOpen = $state(true);
	let mobileOpen = $state(false);

	function toggleSidebar() {
		if (isDesktop.current) {
			sidebarOpen = !sidebarOpen;
		} else {
			mobileOpen = !mobileOpen;
		}
	}
</script>

<div class="flex h-screen overflow-hidden">
	<!-- Desktop sidebar: in-flow, collapsible -->
	{#if isDesktop.current}
		<div
			class="h-full shrink-0 overflow-hidden transition-[width] duration-200"
			style:width={sidebarOpen ? '288px' : '0px'}
		>
			<Sidebar user={data.user} onclose={() => (sidebarOpen = false)} />
		</div>
	{/if}

	<!-- Mobile: sliding container with sidebar and content side by side -->
	{#if !isDesktop.current}
		<div
			class="fixed inset-y-0 left-0 flex w-[200%] transition-transform duration-300 ease-out md:hidden"
			style:transform={mobileOpen ? 'translateX(0)' : 'translateX(-50%)'}
		>
			<div class="h-full w-1/2 shrink-0 [&>aside]:w-full">
				<Sidebar user={data.user} onclose={() => (mobileOpen = false)} />
			</div>
			<div class="h-full w-1/2 shrink-0">
				<main class="relative flex h-full flex-col">
					{@render children()}
				</main>
			</div>
		</div>
	{/if}

	<!-- Desktop main content -->
	{#if isDesktop.current}
		<main class="relative flex min-w-0 flex-1 flex-col">
			{@render children()}
		</main>
	{/if}

	{#if isDesktop.current ? !sidebarOpen : !mobileOpen}
		<button
			class="bg-muted text-muted-foreground hover:bg-accent hover:text-foreground fixed top-[calc(0.5rem+env(safe-area-inset-top))] left-[calc(0.5rem+env(safe-area-inset-left))] z-20 rounded-lg p-2 transition-colors"
			onclick={toggleSidebar}
			aria-label="Open sidebar"
		>
			<PanelLeftIcon class="size-4" />
		</button>
	{/if}
</div>
