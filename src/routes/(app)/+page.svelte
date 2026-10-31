<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import ImageIcon from '@lucide/svelte/icons/image';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import type { ExportConfig, ExportRecord } from '$lib/types.js';

	const DEFAULT_HTML = `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f6f9fc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:24px;color:#0f172a;">Your monthly update</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#334155;">Hello, here is a quick summary of what happened this month.</p>
          <a href="#" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-size:16px;">View report</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

	let configs = $state<ExportConfig[]>([]);
	let recent = $state<ExportRecord[]>([]);
	let selectedId = $state<string | null>(null);
	let mode = $state<'create' | 'edit'>('create');
	let selectedConfig = $derived(configs.find((c) => c.id === selectedId) ?? null);

	let name = $state('newsletter');
	let width = $state(800);
	let height = $state(600);
	let deviceScaleFactor = $state(1);
	let fullPage = $state(true);
	let format = $state<'png' | 'jpeg' | 'webp'>('png');
	let quality = $state(90);
	let omitBackground = $state(false);
	let css = $state('');
	let waitUntil = $state<'load' | 'domcontentloaded' | 'networkidle'>('load');
	let waitForNetworkIdle = $state(false);
	let timeoutMs = $state(10000);

	let html = $state(DEFAULT_HTML);
	let previewUrl = $state<string | null>(null);
	let busy = $state(false);
	let deleteOpen = $state(false);

	async function readError(res: Response): Promise<string> {
		try {
			const body = await res.json();
			return body?.message ?? body?.error ?? res.statusText;
		} catch {
			return res.statusText;
		}
	}

	function fillForm(c: ExportConfig) {
		name = c.name;
		width = c.width;
		height = c.height ?? 600;
		deviceScaleFactor = c.deviceScaleFactor;
		fullPage = c.fullPage;
		format = c.format;
		quality = c.quality ?? 90;
		omitBackground = c.omitBackground;
		css = c.css ?? '';
		waitUntil = c.waitUntil;
		waitForNetworkIdle = c.waitForNetworkIdle;
		timeoutMs = c.timeoutMs;
	}

	function startCreate() {
		mode = 'create';
		selectedId = null;
		name = '';
		width = 800;
		height = 600;
		deviceScaleFactor = 1;
		fullPage = true;
		format = 'png';
		quality = 90;
		omitBackground = false;
		css = '';
		waitUntil = 'load';
		waitForNetworkIdle = false;
		timeoutMs = 10000;
	}

	function select(id: string) {
		selectedId = id;
		const c = configs.find((c) => c.id === id);
		if (c) {
			mode = 'edit';
			fillForm(c);
		}
	}

	async function loadConfigs() {
		const res = await fetch('/api/export-configs');
		if (!res.ok) return;
		const body = await res.json();
		configs = body.configs as ExportConfig[];
		if (selectedId && !configs.some((c) => c.id === selectedId)) {
			selectedId = null;
		}
		if (!selectedId && configs.length > 0) {
			select(configs[0].id);
		}
	}

	async function loadRecent() {
		const res = await fetch('/api/exports');
		if (!res.ok) return;
		const body = await res.json();
		recent = body.exports as ExportRecord[];
	}

	function payload() {
		return {
			name,
			width,
			height: fullPage ? null : height,
			deviceScaleFactor,
			fullPage,
			format,
			quality: format === 'png' ? null : quality,
			omitBackground,
			css: css.trim() === '' ? null : css,
			waitUntil,
			waitForNetworkIdle,
			timeoutMs
		};
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		try {
			const isCreate = mode === 'create';
			const res = await fetch(
				isCreate ? '/api/export-configs' : `/api/export-configs/${selectedId}`,
				{
					method: isCreate ? 'POST' : 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload())
				}
			);
			if (!res.ok) throw new Error(await readError(res));
			const body = await res.json();
			await loadConfigs();
			select(body.config.id);
			toast.success(isCreate ? 'Config created' : 'Config saved');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Save failed');
		} finally {
			busy = false;
		}
	}

	async function confirmDelete() {
		if (!selectedId) return;
		busy = true;
		try {
			const res = await fetch(`/api/export-configs/${selectedId}`, { method: 'DELETE' });
			if (!res.ok) throw new Error(await readError(res));
			selectedId = null;
			deleteOpen = false;
			await loadConfigs();
			startCreate();
			toast.success('Config deleted');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Delete failed');
		} finally {
			busy = false;
		}
	}

	async function render(kind: 'preview' | 'export') {
		if (!selectedId) {
			toast.error('Select a config first');
			return;
		}
		busy = true;
		try {
			const res = await fetch(`/api/export-configs/${selectedId}/${kind}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ html })
			});
			if (!res.ok) throw new Error(await readError(res));
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			if (kind === 'preview') {
				if (previewUrl) URL.revokeObjectURL(previewUrl);
				previewUrl = url;
				toast.success('Preview updated');
			} else {
				const ext = (res.headers.get('content-type') ?? '').includes('jpeg')
					? 'jpg'
					: (res.headers.get('content-type') ?? '').includes('webp')
						? 'webp'
						: 'png';
				const a = document.createElement('a');
				a.href = url;
				a.download = `export.${ext}`;
				a.click();
				toast.success('Export complete');
				await loadRecent();
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Render failed');
		} finally {
			busy = false;
		}
	}

	onMount(() => {
		loadConfigs();
		loadRecent();
	});
</script>

<svelte:head>
	<title>Export configs · HTML2IMG</title>
</svelte:head>

<div class="h-full [scrollbar-gutter:stable] overflow-y-auto">
	<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
		<div class="flex items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-xl font-semibold">Export configs</h1>
				<p class="text-muted-foreground text-sm">
					Named browser setups — viewport, scale, format and more — used to render HTML to images.
				</p>
			</div>
			<Button onclick={startCreate}>
				<PlusIcon class="size-4" />
				New config
			</Button>
		</div>

		<Card.Root>
			<Card.Content class="grid gap-6 lg:grid-cols-[240px_1fr]">
				<div class="flex flex-col gap-1">
					<p class="text-muted-foreground px-1 pb-1 text-xs font-medium">Configs</p>
					{#each configs as config (config.id)}
						<button
							type="button"
							onclick={() => select(config.id)}
							class="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm {selectedId ===
							config.id
								? 'bg-accent text-accent-foreground font-medium'
								: 'text-muted-foreground hover:bg-accent/50'}"
						>
							<span class="truncate">{config.name}</span>
							{#if config.isSystem}
								<Badge variant="secondary" class="shrink-0 text-[10px]">default</Badge>
							{/if}
						</button>
					{/each}
					{#if configs.length === 0}
						<p class="text-muted-foreground px-2 pt-4 text-sm">No configs yet.</p>
					{/if}
				</div>

				<form onsubmit={save} class="flex flex-col gap-4">
					<div class="grid grid-cols-2 gap-4">
						<div class="col-span-2 flex flex-col gap-2">
							<Label for="cfg-name">Name</Label>
							<Input
								id="cfg-name"
								bind:value={name}
								required
								placeholder="e.g. email"
								disabled={mode === 'edit' && selectedConfig?.isSystem}
							/>
						</div>
						<div class="flex flex-col gap-2">
							<Label for="cfg-width">Width (px)</Label>
							<Input
								id="cfg-width"
								type="number"
								min="100"
								max="8000"
								bind:value={width}
								required
							/>
						</div>
						<div class="flex flex-col gap-2">
							<Label for="cfg-height">Height (px)</Label>
							<Input
								id="cfg-height"
								type="number"
								min="100"
								max="8000"
								bind:value={height}
								disabled={fullPage}
							/>
						</div>
						<div class="flex flex-col gap-2">
							<Label for="cfg-dsf">Device scale factor</Label>
							<Input
								id="cfg-dsf"
								type="number"
								min="0.5"
								max="4"
								step="0.5"
								bind:value={deviceScaleFactor}
							/>
						</div>
						<div class="flex flex-col gap-2">
							<Label for="cfg-format">Format</Label>
							<Select.Root
								type="single"
								value={format}
								onValueChange={(value) => (format = value as 'png' | 'jpeg' | 'webp')}
							>
								<Select.Trigger id="cfg-format" class="w-full">
									{format.toUpperCase()}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="png">PNG</Select.Item>
									<Select.Item value="jpeg">JPEG</Select.Item>
									<Select.Item value="webp">WebP</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
						{#if format !== 'png'}
							<div class="flex flex-col gap-2">
								<Label for="cfg-quality">Quality (1-100)</Label>
								<Input id="cfg-quality" type="number" min="1" max="100" bind:value={quality} />
							</div>
						{/if}
						<div class="flex flex-col gap-2">
							<Label for="cfg-timeout">Timeout (ms, max 10000)</Label>
							<Input id="cfg-timeout" type="number" min="1000" max="10000" bind:value={timeoutMs} />
						</div>
						<div class="flex flex-col gap-2">
							<Label for="cfg-wait">Wait until</Label>
							<Select.Root
								type="single"
								value={waitUntil}
								onValueChange={(value) =>
									(waitUntil = value as 'load' | 'domcontentloaded' | 'networkidle')}
							>
								<Select.Trigger id="cfg-wait" class="w-full">{waitUntil}</Select.Trigger>
								<Select.Content>
									<Select.Item value="load">load</Select.Item>
									<Select.Item value="domcontentloaded">domcontentloaded</Select.Item>
									<Select.Item value="networkidle">networkidle</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
					</div>

					<div class="flex flex-col gap-3 border-t pt-4">
						<div class="flex items-center justify-between gap-6">
							<div class="flex flex-col gap-1">
								<Label for="cfg-fullpage" class="font-normal">Full page</Label>
								<p class="text-muted-foreground text-sm">Capture the full scroll height.</p>
							</div>
							<Switch id="cfg-fullpage" bind:checked={fullPage} />
						</div>
						<div class="flex items-center justify-between gap-6">
							<div class="flex flex-col gap-1">
								<Label for="cfg-idle" class="font-normal">Wait for network idle</Label>
								<p class="text-muted-foreground text-sm">
									Wait for no network activity before capture.
								</p>
							</div>
							<Switch id="cfg-idle" bind:checked={waitForNetworkIdle} />
						</div>
						<div class="flex items-center justify-between gap-6">
							<div class="flex flex-col gap-1">
								<Label for="cfg-bg" class="font-normal">Transparent background</Label>
								<p class="text-muted-foreground text-sm">Omit the white background (PNG/WebP).</p>
							</div>
							<Switch id="cfg-bg" bind:checked={omitBackground} />
						</div>
					</div>

					<div class="flex flex-col gap-2">
						<Label for="cfg-css">Extra CSS (optional)</Label>
						<Textarea
							id="cfg-css"
							bind:value={css}
							placeholder={'Optional CSS, e.g. body { margin: 0 }'}
							class="min-h-24 font-mono"
						/>
					</div>

					<div class="flex items-center gap-2">
						<Button type="submit" disabled={busy || (mode === 'edit' && selectedId == null)}>
							{busy ? 'Saving…' : mode === 'create' ? 'Create config' : 'Save changes'}
						</Button>
						{#if mode === 'edit' && selectedId && !selectedConfig?.isSystem}
							<Button
								type="button"
								variant="destructive"
								disabled={busy}
								onclick={() => (deleteOpen = true)}
							>
								<Trash2Icon class="size-4" />
								Delete
							</Button>
						{/if}
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Manual export</Card.Title>
				<Card.Description>Paste HTML and render it with a config.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<Label for="export-config" class="text-muted-foreground text-sm">Config</Label>
					<Select.Root
						type="single"
						value={selectedId ?? undefined}
						onValueChange={(value) => value && select(value)}
					>
						<Select.Trigger id="export-config" class="w-full sm:w-56">
							{selectedConfig?.name ?? 'Select a config'}
						</Select.Trigger>
						<Select.Content>
							{#each configs as config (config.id)}
								<Select.Item value={config.id}>
									{config.name}
									{#if config.isSystem}
										(default){/if}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<Textarea bind:value={html} placeholder="Paste HTML here…" class="min-h-64 font-mono" />

				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						disabled={busy || !selectedId}
						onclick={() => render('preview')}
					>
						<EyeIcon class="size-4" />
						{busy ? 'Rendering…' : 'Preview'}
					</Button>
					<Button disabled={busy || !selectedId} onclick={() => render('export')}>
						<ImageIcon class="size-4" />
						Export image
					</Button>
				</div>

				{#if previewUrl}
					<div class="rounded-lg border p-3">
						<div class="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
							Preview
						</div>
						<div class="bg-muted/40 overflow-auto rounded p-2">
							<img src={previewUrl} alt="Rendered HTML preview" class="mx-auto max-w-full" />
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Recent exports</Card.Title>
				<Card.Description>Your latest renders, newest first.</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>When</Table.Head>
							<Table.Head>Config</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Output</Table.Head>
							<Table.Head>Error</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each recent as item (item.id)}
							<Table.Row>
								<Table.Cell class="text-muted-foreground whitespace-nowrap">
									{new Date(item.createdAt).toLocaleString()}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{configs.find((c) => c.id === item.configId)?.name ?? '—'}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={item.status === 'success' ? 'secondary' : 'destructive'}>
										{item.status}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{#if item.mime}
										{item.mime} · {item.size ?? 0} bytes
									{:else}—{/if}
								</Table.Cell>
								<Table.Cell class="text-destructive max-w-48 truncate" title={item.error ?? ''}>
									{item.error ?? ''}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={5} class="text-muted-foreground text-center">
									No exports yet.
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<Dialog.Root open={deleteOpen} onOpenChange={(open) => !open && (deleteOpen = false)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete config?</Dialog.Title>
			<Dialog.Description>
				"{selectedConfig?.name}" will be permanently removed. Existing API keys referencing it by
				name will stop working.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteOpen = false)}>Cancel</Button>
			<Button variant="destructive" disabled={busy} onclick={confirmDelete}>Delete</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
