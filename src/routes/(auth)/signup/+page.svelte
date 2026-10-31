<script lang="ts">
	import { authClient } from '$lib/auth-client.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMessage = $state('');

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		errorMessage = '';
		const { error } = await authClient.signUp.email({
			name,
			email,
			password,
			callbackURL: '/'
		});
		if (error) {
			errorMessage = error.message ?? 'Sign up failed';
			loading = false;
			return;
		}
		await goto(resolve('/'));
	}
</script>

<div class="bg-card text-card-foreground flex w-full flex-col gap-6 rounded-4xl border p-8">
	<h1 class="text-center text-xl font-semibold tracking-tight">Create your account</h1>

	{#if data.authConfig.signup}
		<form onsubmit={submit} class="flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<Label for="name">Name</Label>
				<Input id="name" type="text" bind:value={name} required autocomplete="name" />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="email">Email</Label>
				<Input id="email" type="email" bind:value={email} required autocomplete="email" />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="password">Password</Label>
				<Input
					id="password"
					type="password"
					bind:value={password}
					required
					minlength={8}
					autocomplete="new-password"
				/>
			</div>
			{#if errorMessage}
				<p class="text-destructive text-sm">{errorMessage}</p>
			{/if}
			<Button type="submit" disabled={loading} class="w-full">
				{loading ? 'Creating account…' : 'Sign up'}
			</Button>
		</form>
	{:else}
		<p class="text-muted-foreground text-center text-sm">Sign-up is disabled.</p>
	{/if}

	<p class="text-muted-foreground text-center text-sm">
		Already have an account? <a
			href={resolve('/login')}
			class="text-foreground underline-offset-4 hover:underline">Sign in</a
		>
	</p>
</div>
