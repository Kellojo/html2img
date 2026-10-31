<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { ApiKey } from '$lib/types.js';

	let keys = $state<ApiKey[]>([]);
	let label = $state('');
	let created = $state<{ label: string; rawKey: string } | null>(null);
	let busy = $state(false);
	let copied = $state(false);

	async function load() {
		const res = await fetch('/api/api-keys');
		if (res.ok) {
			const body = await res.json();
			keys = body.keys as ApiKey[];
		}
	}

	async function create(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		try {
			const res = await fetch('/api/api-keys', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ label })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				throw new Error(body?.message ?? 'Failed to create key');
			}
			const body = await res.json();
			created = { label: body.key.label, rawKey: body.key.rawKey };
			label = '';
			await load();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to create key');
		} finally {
			busy = false;
		}
	}

	async function remove(id: string) {
		const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
		if (res.ok) {
			await load();
			toast.success('Key deleted');
		} else {
			toast.error('Failed to delete key');
		}
	}

	async function copyKey() {
		if (!created) return;
		try {
			await navigator.clipboard.writeText(created.rawKey);
			copied = true;
			toast.success('Key copied to clipboard');
			setTimeout(() => (copied = false), 2000);
		} catch {
			toast.error('Failed to copy');
		}
	}

	onMount(load);
</script>

<svelte:head>
	<title>API keys · HTML2IMG</title>
</svelte:head>

<div class="h-full [scrollbar-gutter:stable] overflow-y-auto">
	<div class="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
		<div class="flex flex-col gap-1">
			<h1 class="text-xl font-semibold">API keys</h1>
			<p class="text-muted-foreground text-sm">
				Authenticate calls to your export API via the
				<code class="bg-muted rounded px-1 py-0.5 font-mono text-xs">Authorization: Bearer</code>
				header.
			</p>
		</div>

		{#if created}
			<Card.Root class="border-success/30 bg-success/10">
				<Card.Content class="flex flex-col gap-3">
					<div class="flex items-center gap-2">
						<KeyRoundIcon class="text-success-foreground size-4" />
						<p class="text-success-foreground font-medium">
							Copy your API key now — it won't be shown again.
						</p>
					</div>
					<div class="flex items-center gap-2">
						<code class="bg-background/60 flex-1 rounded px-3 py-2 font-mono text-sm break-all">
							{created.rawKey}
						</code>
						<Button variant="outline" size="icon" onclick={copyKey} aria-label="Copy key">
							{#if copied}
								<CheckIcon class="size-4" />
							{:else}
								<CopyIcon class="size-4" />
							{/if}
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<Card.Root>
			<Card.Header>
				<Card.Title>Create a key</Card.Title>
				<Card.Description>Keys are associated with your account and never expire.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form onsubmit={create} class="flex flex-col gap-2 sm:flex-row sm:items-end">
					<div class="flex flex-1 flex-col gap-2">
						<Label for="key-label">Label</Label>
						<Input
							id="key-label"
							bind:value={label}
							placeholder="e.g. n8n"
							required
							maxlength={100}
						/>
					</div>
					<Button type="submit" disabled={busy}>
						<PlusIcon class="size-4" />
						{busy ? 'Creating…' : 'Create key'}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Your keys</Card.Title>
				<Card.Description
					>{keys.length} key{keys.length === 1 ? '' : 's'} in total.</Card.Description
				>
			</Card.Header>
			<Card.Content>
				{#if keys.length === 0}
					<p class="text-muted-foreground text-sm">No API keys yet.</p>
				{:else}
					<div class="divide-y">
						{#each keys as key (key.id)}
							<div class="flex items-center justify-between gap-4 py-3">
								<div class="min-w-0">
									<div class="flex items-center gap-2">
										<span class="font-medium">{key.label}</span>
										{#each key.scopes as scope (scope)}
											<Badge variant="outline" class="text-[10px]">{scope}</Badge>
										{/each}
									</div>
									<div class="text-muted-foreground text-xs">
										Created {new Date(key.createdAt).toLocaleString()}{#if key.lastUsedAt}
											· last used {new Date(key.lastUsedAt).toLocaleString()}{/if}
									</div>
								</div>
								<Button variant="outline" size="sm" onclick={() => remove(key.id)}>
									<Trash2Icon class="size-4" />
									Delete
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
