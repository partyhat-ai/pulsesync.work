<!-- src/routes/u/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { derived } from 'svelte/store';

  import LandingPage from '$lib/LandingPage.svelte';
  import MainApp      from '$lib/MainApp.svelte';
  import DownloadsPage from '$lib/DownloadsPage.svelte';
  import CancelPage from '$lib/CancelPage.svelte';

  // reactive store → either "landing", "app", "downloads", or "cancel"
  export const view = derived(page, ($page) => {
    const viewParam = $page.url.searchParams.get('view');
    if (viewParam === 'app') return 'app';
    if (viewParam === 'downloads') return 'downloads';
    if (viewParam === 'cancel') return 'cancel';
    return 'landing';
  });
</script>

{#if $view === 'app'}
  <MainApp />
{:else if $view === 'downloads'}
  <DownloadsPage />
{:else if $view === 'cancel'}
  <CancelPage />
{:else}
  <LandingPage />
{/if}
