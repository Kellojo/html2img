<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<svelte:head>
	<title>HTML2IMG</title>
	<meta name="theme-color" content="#0a0a0a" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</svelte:head>

<ModeWatcher defaultMode="system" disableHeadScriptInjection />
{@render children()}
<Toaster />
