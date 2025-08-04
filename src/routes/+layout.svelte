<script>
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>{$page.data?.title || 'PulseSync'}</title>
  <meta name="description" content={$page.data?.description || 'Your Future, Safely Stored'} />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={$page.data?.canonicalUrl || $page.url.href} />
  <meta property="og:title" content={$page.data?.ogTitle || $page.data?.title || 'PulseSync'} />
  <meta property="og:description" content={$page.data?.ogDescription || $page.data?.description || 'Your Future, Safely Stored'} />
  <meta property="og:image" content={$page.data?.ogImage || '/pulsesync-og.png'} />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content={$page.data?.canonicalUrl || $page.url.href} />
  <meta name="twitter:title" content={$page.data?.ogTitle || $page.data?.title || 'PulseSync'} />
  <meta name="twitter:description" content={$page.data?.ogDescription || $page.data?.description || 'Your Future, Safely Stored'} />
  <meta name="twitter:image" content={$page.data?.ogImage || '/pulsesync-og.png'} />
  
  <!-- Canonical URL -->
  <link rel="canonical" href={$page.data?.canonicalUrl || $page.url.href} />
</svelte:head>

<slot />