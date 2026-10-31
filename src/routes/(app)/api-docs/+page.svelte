<script lang="ts">
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import CodeIcon from '@lucide/svelte/icons/code';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	let copied = $state<string | null>(null);

	async function copy(text: string, id: string) {
		await navigator.clipboard.writeText(text);
		copied = id;
		setTimeout(() => (copied = id === copied ? null : copied), 2000);
	}

	const curlExample = `curl -X POST http://localhost:3000/api/v1/export/email \\
  -H "Authorization: Bearer h2i_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"html":"<b>Hello world</b>"}' \\
  -o export.png`;

	const jsExample = `const res = await fetch('http://localhost:3000/api/v1/export/email', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer h2i_YOUR_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    html: '<h1>Invoice</h1><table>...</table>'
  })
});
const blob = await res.blob();
const url = URL.createObjectURL(blob);`;

	const pythonExample = `import requests

res = requests.post(
    'http://localhost:3000/api/v1/export/email',
    headers={
        'Authorization': 'Bearer h2i_YOUR_KEY',
        'Content-Type': 'application/json'
    },
    json={'html': '<h1>Report</h1><p>Q4 results...</p>'}
)
with open('export.png', 'wb') as f:
    f.write(res.content)`;

	const n8nExample = `// n8n HTTP Request node
{
  "method": "POST",
  "url": "http://your-server:3000/api/v1/export/email",
  "headers": {
    "Authorization": "Bearer h2i_YOUR_KEY",
    "Content-Type": "application/json"
  },
  "body": {
    "html": "={{ $json.html }}",
    "width": 800,
    "fullPage": true
  }
}`;
</script>

<svelte:head>
	<title>API docs · HTML2IMG</title>
</svelte:head>

<div class="h-full overflow-y-auto [scrollbar-gutter:stable]">
	<div class="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6">
		<div class="flex items-start gap-3">
			<div class="bg-foreground text-background mt-1 flex size-10 shrink-0 items-center justify-center rounded-lg">
				<BookOpenIcon class="size-5" />
			</div>
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-semibold">HTTP API</h1>
				<p class="text-muted-foreground">
					Render HTML to images from any HTTP client — n8n, curl, Python, JavaScript, or your CI pipeline.
				</p>
			</div>
		</div>

		<!-- Quick start -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Quick start</Card.Title>
				<Card.Description>Three steps to your first export from the command line.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<p class="text-sm font-medium">1. Create an API key</p>
					<p class="text-muted-foreground text-sm">
						Head to <a href="/api-keys" class="underline underline-offset-2">API keys</a>, enter a
						label like "n8n", and copy the key. It starts with <code class="bg-muted rounded px-1 py-0.5 font-mono text-xs">h2i_</code>.
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<p class="text-sm font-medium">2. Pick an export config</p>
					<p class="text-muted-foreground text-sm">
						Every account gets an <code class="bg-muted rounded px-1 py-0.5 font-mono text-xs">email</code>
						config seeded by default (600px wide, full height, &times;2, PNG). Create your own on the
						<a href="/" class="underline underline-offset-2">Export configs</a> page.
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<p class="text-sm font-medium">3. Call the endpoint</p>
					<div class="bg-muted/50 relative rounded-lg border p-3">
						<button
							type="button"
							class="absolute top-2 right-2 rounded-md p-1.5 hover:bg-muted transition-colors"
							onclick={() => copy(curlExample, 'curl')}
							aria-label="Copy curl example"
						>
							{#if copied === 'curl'}
								<CheckIcon class="size-4 text-green-600" />
							{:else}
								<CopyIcon class="size-4" />
							{/if}
						</button>
						<pre class="text-sm overflow-x-auto"><code>{curlExample}</code></pre>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Endpoint reference -->
		<Card.Root id="reference">
			<Card.Header>
				<Card.Title>Endpoint</Card.Title>
				<Card.Description>All exports are single POST calls. The config name lives in the URL.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-6">
				<div class="flex items-center gap-3">
					<Badge variant="secondary" class="font-mono text-sm px-3 py-1">POST</Badge>
					<code class="bg-muted rounded px-2 py-1 font-mono text-sm break-all">/api/v1/export/:config</code>
				</div>

				<hr class="my-4" />

				<div>
					<h3 class="text-sm font-semibold mb-2">Headers</h3>
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b">
								<th class="py-2 text-left font-medium text-muted-foreground">Name</th>
								<th class="py-2 text-left font-medium text-muted-foreground">Required</th>
								<th class="py-2 text-left font-medium text-muted-foreground">Description</th>
							</tr>
						</thead>
						<tbody>
							<tr class="border-b">
								<td class="py-2 font-mono">Authorization</td>
								<td class="py-2"><Badge variant="outline" class="text-[10px]">Yes</Badge></td>
								<td class="py-2 text-muted-foreground">
									<code class="bg-muted rounded px-1 font-mono text-xs">Bearer h2i_...</code>
									— your API key
								</td>
							</tr>
							<tr class="border-b">
								<td class="py-2 font-mono">Content-Type</td>
								<td class="py-2"><Badge variant="outline" class="text-[10px]">Yes</Badge></td>
								<td class="py-2 text-muted-foreground">
									<code class="bg-muted rounded px-1 font-mono text-xs">application/json</code>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<hr class="my-4" />

				<div>
					<h3 class="text-sm font-semibold mb-2">Request body</h3>
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b">
								<th class="py-2 text-left font-medium text-muted-foreground">Field</th>
								<th class="py-2 text-left font-medium text-muted-foreground">Type</th>
								<th class="py-2 text-left font-medium text-muted-foreground">Required</th>
								<th class="py-2 text-left font-medium text-muted-foreground">Default</th>
								<th class="py-2 text-left font-medium text-muted-foreground">Description</th>
							</tr>
						</thead>
						<tbody>
							<tr class="border-b">
								<td class="py-2 font-mono">html</td>
								<td class="py-2 font-mono text-xs">string</td>
								<td class="py-2"><Badge variant="outline" class="text-[10px]">Yes</Badge></td>
								<td class="py-2 font-mono text-xs text-muted-foreground">—</td>
								<td class="py-2 text-muted-foreground">HTML to render (1–1,000,000 chars)</td>
							</tr>
							<tr class="border-b">
								<td class="py-2 font-mono">width</td>
								<td class="py-2 font-mono text-xs">number</td>
								<td class="py-2"><span class="text-muted-foreground text-xs">—</span></td>
								<td class="py-2 font-mono text-xs text-muted-foreground">From config</td>
								<td class="py-2 text-muted-foreground">Viewport width (100–8000)</td>
							</tr>
							<tr class="border-b">
								<td class="py-2 font-mono">height</td>
								<td class="py-2 font-mono text-xs">number | null</td>
								<td class="py-2"><span class="text-muted-foreground text-xs">—</span></td>
								<td class="py-2 font-mono text-xs text-muted-foreground">From config</td>
								<td class="py-2 text-muted-foreground">Viewport height. Required unless fullPage</td>
							</tr>
							<tr class="border-b">
								<td class="py-2 font-mono">fullPage</td>
								<td class="py-2 font-mono text-xs">boolean</td>
								<td class="py-2"><span class="text-muted-foreground text-xs">—</span></td>
								<td class="py-2 font-mono text-xs text-muted-foreground">From config</td>
								<td class="py-2 text-muted-foreground">Capture full scroll height</td>
							</tr>
							<tr class="border-b">
								<td class="py-2 font-mono">deviceScaleFactor</td>
								<td class="py-2 font-mono text-xs">number</td>
								<td class="py-2"><span class="text-muted-foreground text-xs">—</span></td>
								<td class="py-2 font-mono text-xs text-muted-foreground">From config</td>
								<td class="py-2 text-muted-foreground">Pixel density (0.5–4). 2 = retina</td>
							</tr>
							<tr class="border-b">
								<td class="py-2 font-mono">format</td>
								<td class="py-2 font-mono text-xs">string</td>
								<td class="py-2"><span class="text-muted-foreground text-xs">—</span></td>
								<td class="py-2 font-mono text-xs text-muted-foreground">From config</td>
								<td class="py-2 text-muted-foreground">
									<Badge variant="outline" class="text-[10px] font-mono">png</Badge>
									<Badge variant="outline" class="text-[10px] font-mono">jpeg</Badge>
									<Badge variant="outline" class="text-[10px] font-mono">webp</Badge>
								</td>
							</tr>
							<tr class="border-b">
								<td class="py-2 font-mono">quality</td>
								<td class="py-2 font-mono text-xs">number | null</td>
								<td class="py-2"><span class="text-muted-foreground text-xs">—</span></td>
								<td class="py-2 font-mono text-xs text-muted-foreground">From config</td>
								<td class="py-2 text-muted-foreground">JPEG/WebP quality (1–100)</td>
							</tr>
							<tr class="border-b">
								<td class="py-2 font-mono">omitBackground</td>
								<td class="py-2 font-mono text-xs">boolean</td>
								<td class="py-2"><span class="text-muted-foreground text-xs">—</span></td>
								<td class="py-2 font-mono text-xs text-muted-foreground">From config</td>
								<td class="py-2 text-muted-foreground">Transparent background (PNG/WebP)</td>
							</tr>
							<tr class="border-b">
								<td class="py-2 font-mono">css</td>
								<td class="py-2 font-mono text-xs">string | null</td>
								<td class="py-2"><span class="text-muted-foreground text-xs">—</span></td>
								<td class="py-2 font-mono text-xs text-muted-foreground">From config</td>
								<td class="py-2 text-muted-foreground">Extra CSS injected before capture</td>
							</tr>
							<tr class="border-b">
								<td class="py-2 font-mono">waitUntil</td>
								<td class="py-2 font-mono text-xs">string</td>
								<td class="py-2"><span class="text-muted-foreground text-xs">—</span></td>
								<td class="py-2 font-mono text-xs text-muted-foreground">From config</td>
								<td class="py-2 text-muted-foreground">
									<Badge variant="outline" class="text-[10px] font-mono">load</Badge>
									<Badge variant="outline" class="text-[10px] font-mono">domcontentloaded</Badge>
									<Badge variant="outline" class="text-[10px] font-mono">networkidle</Badge>
								</td>
							</tr>
							<tr class="border-b">
								<td class="py-2 font-mono">waitForNetworkIdle</td>
								<td class="py-2 font-mono text-xs">boolean</td>
								<td class="py-2"><span class="text-muted-foreground text-xs">—</span></td>
								<td class="py-2 font-mono text-xs text-muted-foreground">From config</td>
								<td class="py-2 text-muted-foreground">Wait for network to settle</td>
							</tr>
							<tr>
								<td class="py-2 font-mono">timeoutMs</td>
								<td class="py-2 font-mono text-xs">number</td>
								<td class="py-2"><span class="text-muted-foreground text-xs">—</span></td>
								<td class="py-2 font-mono text-xs text-muted-foreground">From config</td>
								<td class="py-2 text-muted-foreground">Per-export timeout (1000–10000ms)</td>
							</tr>
						</tbody>
					</table>
				</div>

				<hr class="my-4" />

				<div>
					<h3 class="text-sm font-semibold mb-2">Responses</h3>
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b">
								<th class="py-2 text-left font-medium text-muted-foreground">Status</th>
								<th class="py-2 text-left font-medium text-muted-foreground">Meaning</th>
							</tr>
						</thead>
						<tbody>
							<tr class="border-b">
								<td class="py-2"><Badge variant="secondary">200</Badge></td>
								<td class="py-2 text-muted-foreground">Raw image bytes. <code class="bg-muted rounded px-1 font-mono text-xs">Content-Type</code> header is the image MIME. <code class="bg-muted rounded px-1 font-mono text-xs">X-Export-Id</code> identifies the export record.</td>
							</tr>
							<tr class="border-b">
								<td class="py-2"><Badge variant="outline">400</Badge></td>
								<td class="py-2 text-muted-foreground">Invalid body (missing html, invalid types, etc.)</td>
							</tr>
							<tr class="border-b">
								<td class="py-2"><Badge variant="outline">401</Badge></td>
								<td class="py-2 text-muted-foreground">Missing or invalid API key</td>
							</tr>
							<tr class="border-b">
								<td class="py-2"><Badge variant="outline">403</Badge></td>
								<td class="py-2 text-muted-foreground">API key valid but missing <code class="bg-muted rounded px-1 font-mono text-xs">export:create</code> scope</td>
							</tr>
							<tr class="border-b">
								<td class="py-2"><Badge variant="outline">404</Badge></td>
								<td class="py-2 text-muted-foreground">Export config not found (the name in the URL doesn't match any config)</td>
							</tr>
							<tr>
								<td class="py-2"><Badge variant="outline">408</Badge></td>
								<td class="py-2 text-muted-foreground">Export timed out (10 second hard cap)</td>
							</tr>
						</tbody>
					</table>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Examples -->
		<Card.Root id="examples">
			<Card.Header>
				<Card.Title>Examples</Card.Title>
				<Card.Description>Copy-paste snippets for common environments.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-6">
				<div>
					<div class="flex items-center gap-2 mb-2">
						<CodeIcon class="size-4" />
						<h3 class="text-sm font-semibold">curl</h3>
					</div>
					<div class="bg-muted/50 relative rounded-lg border p-3">
						<button
							type="button"
							class="absolute top-2 right-2 rounded-md p-1.5 hover:bg-muted transition-colors"
							onclick={() => copy(curlExample, 'curl2')}
							aria-label="Copy curl example"
						>
							{#if copied === 'curl2'}
								<CheckIcon class="size-4 text-green-600" />
							{:else}
								<CopyIcon class="size-4" />
							{/if}
						</button>
						<pre class="text-sm overflow-x-auto"><code>{curlExample}</code></pre>
					</div>
				</div>

				<div>
					<div class="flex items-center gap-2 mb-2">
						<CodeIcon class="size-4" />
						<h3 class="text-sm font-semibold">JavaScript / Node.js</h3>
					</div>
					<div class="bg-muted/50 relative rounded-lg border p-3">
						<button
							type="button"
							class="absolute top-2 right-2 rounded-md p-1.5 hover:bg-muted transition-colors"
							onclick={() => copy(jsExample, 'js')}
							aria-label="Copy JS example"
						>
							{#if copied === 'js'}
								<CheckIcon class="size-4 text-green-600" />
							{:else}
								<CopyIcon class="size-4" />
							{/if}
						</button>
						<pre class="text-sm overflow-x-auto"><code>{jsExample}</code></pre>
					</div>
				</div>

				<div>
					<div class="flex items-center gap-2 mb-2">
						<CodeIcon class="size-4" />
						<h3 class="text-sm font-semibold">Python</h3>
					</div>
					<div class="bg-muted/50 relative rounded-lg border p-3">
						<button
							type="button"
							class="absolute top-2 right-2 rounded-md p-1.5 hover:bg-muted transition-colors"
							onclick={() => copy(pythonExample, 'py')}
							aria-label="Copy Python example"
						>
							{#if copied === 'py'}
								<CheckIcon class="size-4 text-green-600" />
							{:else}
								<CopyIcon class="size-4" />
							{/if}
						</button>
						<pre class="text-sm overflow-x-auto"><code>{pythonExample}</code></pre>
					</div>
				</div>

				<div>
					<div class="flex items-center gap-2 mb-2">
						<CodeIcon class="size-4" />
						<h3 class="text-sm font-semibold">n8n</h3>
					</div>
					<div class="bg-muted/50 relative rounded-lg border p-3">
						<button
							type="button"
							class="absolute top-2 right-2 rounded-md p-1.5 hover:bg-muted transition-colors"
							onclick={() => copy(n8nExample, 'n8n')}
							aria-label="Copy n8n example"
						>
							{#if copied === 'n8n'}
								<CheckIcon class="size-4 text-green-600" />
							{:else}
								<CopyIcon class="size-4" />
							{/if}
						</button>
						<pre class="text-sm overflow-x-auto"><code>{n8nExample}</code></pre>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Strip endpoint -->
		<Card.Root id="strip">
			<Card.Header>
				<Card.Title>POST /api/v1/strip</Card.Title>
				<Card.Description>Strip HTML tags and decode entities, returning plain text.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-6">
				<div class="flex items-center gap-3">
					<Badge variant="secondary" class="font-mono text-sm px-3 py-1">POST</Badge>
					<code class="bg-muted rounded px-2 py-1 font-mono text-sm">/api/v1/strip</code>
				</div>

				<hr class="my-4" />

				<div>
					<h3 class="text-sm font-semibold mb-2">Request body</h3>
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b">
								<th class="py-2 text-left font-medium text-muted-foreground">Field</th>
								<th class="py-2 text-left font-medium text-muted-foreground">Type</th>
								<th class="py-2 text-left font-medium text-muted-foreground">Required</th>
								<th class="py-2 text-left font-medium text-muted-foreground">Description</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="py-2 font-mono">html</td>
								<td class="py-2 font-mono text-xs">string</td>
								<td class="py-2"><Badge variant="outline" class="text-[10px]">Yes</Badge></td>
								<td class="py-2 text-muted-foreground">HTML string to strip (1–1,000,000 chars)</td>
							</tr>
						</tbody>
					</table>
				</div>

				<hr class="my-4" />

				<div>
					<h3 class="text-sm font-semibold mb-2">Example</h3>
					<div class="bg-muted/50 relative rounded-lg border p-3">
						<pre class="text-sm overflow-x-auto"><code>{`curl -X POST http://localhost:3000/api/v1/strip \\
  -H "Authorization: Bearer h2i_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"html":"<div><p>Hello &amp; welcome</p><span> to our <b>site</b></span></div>"}'`}</code></pre>
					</div>
					<p class="text-muted-foreground text-sm mt-2">
						Response: <code class="bg-muted rounded px-1 font-mono text-xs">{'{ "text": "Hello & welcome to our site" }'}</code>
					</p>
				</div>

				<p class="text-muted-foreground text-sm">
					Uses the same <code class="bg-muted rounded px-1 font-mono text-xs">Authorization: Bearer h2i_...</code>
					header and <code class="bg-muted rounded px-1 font-mono text-xs">export:create</code> scope as the export endpoint.
					Decodes common HTML entities (&amp;amp;, &amp;lt;, &amp;pound;, &amp;euro;, etc.) and normalises whitespace.
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Other endpoints -->
		<Card.Root id="other-endpoints">
			<Card.Header>
				<Card.Title>Session-authenticated endpoints</Card.Title>
				<Card.Description>These are used by the browser UI and require your login session cookie, not an API key.</Card.Description>
			</Card.Header>
			<Card.Content>
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b">
							<th class="py-2 text-left font-medium text-muted-foreground">Method</th>
							<th class="py-2 text-left font-medium text-muted-foreground">Path</th>
							<th class="py-2 text-left font-medium text-muted-foreground">Description</th>
						</tr>
					</thead>
					<tbody>
						<tr class="border-b">
							<td class="py-2"><Badge class="font-mono text-[10px]">GET</Badge></td>
							<td class="py-2 font-mono text-xs">/api/export-configs</td>
							<td class="py-2 text-muted-foreground">List your configs + system templates</td>
						</tr>
						<tr class="border-b">
							<td class="py-2"><Badge class="font-mono text-[10px] bg-green-600 hover:bg-green-700">POST</Badge></td>
							<td class="py-2 font-mono text-xs">/api/export-configs</td>
							<td class="py-2 text-muted-foreground">Create a config</td>
						</tr>
						<tr class="border-b">
							<td class="py-2"><Badge class="font-mono text-[10px]">GET</Badge></td>
							<td class="py-2 font-mono text-xs">/api/export-configs/:id</td>
							<td class="py-2 text-muted-foreground">Get one config</td>
						</tr>
						<tr class="border-b">
							<td class="py-2"><Badge class="font-mono text-[10px] bg-amber-600 hover:bg-amber-700">PATCH</Badge></td>
							<td class="py-2 font-mono text-xs">/api/export-configs/:id</td>
							<td class="py-2 text-muted-foreground">Update an owned config</td>
						</tr>
						<tr class="border-b">
							<td class="py-2"><Badge class="font-mono text-[10px] bg-destructive hover:bg-destructive/90">DELETE</Badge></td>
							<td class="py-2 font-mono text-xs">/api/export-configs/:id</td>
							<td class="py-2 text-muted-foreground">Delete an owned config</td>
						</tr>
						<tr class="border-b">
							<td class="py-2"><Badge class="font-mono text-[10px] bg-green-600 hover:bg-green-700">POST</Badge></td>
							<td class="py-2 font-mono text-xs">/api/export-configs/:id/preview</td>
							<td class="py-2 text-muted-foreground">Render HTML to image (no history)</td>
						</tr>
						<tr class="border-b">
							<td class="py-2"><Badge class="font-mono text-[10px] bg-green-600 hover:bg-green-700">POST</Badge></td>
							<td class="py-2 font-mono text-xs">/api/export-configs/:id/export</td>
							<td class="py-2 text-muted-foreground">Render HTML + record export</td>
						</tr>
						<tr class="border-b">
							<td class="py-2"><Badge class="font-mono text-[10px]">GET</Badge></td>
							<td class="py-2 font-mono text-xs">/api/exports</td>
							<td class="py-2 text-muted-foreground">List recent export records</td>
						</tr>
						<tr class="border-b">
							<td class="py-2"><Badge class="font-mono text-[10px]">GET</Badge></td>
							<td class="py-2 font-mono text-xs">/api/api-keys</td>
							<td class="py-2 text-muted-foreground">List your API keys</td>
						</tr>
						<tr class="border-b">
							<td class="py-2"><Badge class="font-mono text-[10px] bg-green-600 hover:bg-green-700">POST</Badge></td>
							<td class="py-2 font-mono text-xs">/api/api-keys</td>
							<td class="py-2 text-muted-foreground">Create an API key (raw key returned once)</td>
						</tr>
						<tr class="border-b">
							<td class="py-2"><Badge class="font-mono text-[10px] bg-destructive hover:bg-destructive/90">DELETE</Badge></td>
							<td class="py-2 font-mono text-xs">/api/api-keys/:id</td>
							<td class="py-2 text-muted-foreground">Delete an API key</td>
						</tr>
						<tr>
							<td class="py-2"><Badge class="font-mono text-[10px]">GET</Badge></td>
							<td class="py-2 font-mono text-xs">/api/health</td>
							<td class="py-2 text-muted-foreground">Health check</td>
						</tr>
					</tbody>
				</table>
			</Card.Content>
		</Card.Root>
	</div>
</div>