<script lang="ts">
  import Confetti from 'svelte-confetti';
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { writable, derived } from 'svelte/store';


  let configVault = {};
  export let vault1Name = 'Vault 1';
  export let vault2Name = 'Vault 2';
  let vault1Description = '';
  let vault2Description = '';
  let vault1Instruct = '';
  let vault1Instruct2 = '';

  export const vault2MediaCount = writable(0);
export const vault2MediaSizeMB = writable(0);

  let showDropdown = false;
  let showVault1Dropdown = false;
  let showVault2Dropdown = false;
  let showVideoModal = false;

  // Slushy upload progress tracking
  let uploadStatus = 'idle'; // idle, uploading, completed, error
  let uploadProgress = { current: 0, total: 0, currentFile: '', percentage: 0 };

  const vault1PlatformOptions = [
        { name: "OnlyFans", url: "onlyfans.com" },
    { name: "Fansly", url: "fansly.com" },
    { name: "Slushy", url: "slushy.com" },
    { name: "Fanvue", url: "fanvue.com" },
    { name: "SextPanther", url: "sextpanther.com" }

  ];

  const vault2PlatformOptions = [
    { name: "Download to this device", url: "local" },
    { name: "Slushy", url: "slushy.com" },
    { name: "OnlyFans", url: "onlyfans.com" },
    { name: "Fansly", url: "fansly.com" },
    { name: "Fanvue", url: "fanvue.com" },
    { name: "SextPanther", url: "sextpanther.com" }

  ];

  let selectedVault1Platform = vault1PlatformOptions[0].name;
  let selectedVault2Platform = vault2PlatformOptions[0].name;

  export const mediaCount = writable(0);
  export const mediaSizeMB = writable(0);
  const noMedia = derived(
    [mediaCount, mediaSizeMB],
    ([$count, $mb]) => $count === 0 && $mb === 0
  );

  $: mediaSize = $mediaSizeMB ? $mediaSizeMB : 0;

  // Update vault names and descriptions when platform selection changes
  $: vault1Name = selectedVault1Platform === 'Choose platform...' ? 'Source Vault' : `Source Vault`;
  $: vault2Name = selectedVault2Platform === 'Choose platform...' ? 'Destination Vault' : `Destination Vault`;
  $: if (vault1State === 'idle') vault1Description = selectedVault1Platform === 'Choose platform...' ? `Choose where to fetch your content from` : `Ready to connect to ${selectedVault1Platform}`;
  $: if (vault2State === 'idle') vault2Description = selectedVault2Platform === 'Choose platform...' ? 'Choose where to move your content to' : selectedVault2Platform === `Download to this device` ? `Be sure to add your content first`: `Ready to connect to ${selectedVault2Platform}`;

  // NEW: track whether popups are closed
  const vault1Closed = writable(false);
  const vault2Closed = writable(false);

  $: if ($vault2Closed) vault2Description = '';
  $: if ($vault2Closed) mediaCount.set(0);
  // Event listener cleanup functions
  let cleanupMediaSummary: (() => void) | null = null;
  let cleanupPopupWindowStatus: (() => void) | null = null;
  let cleanupVault2LoginSuccess: (() => void) | null = null;
  let cleanupPopupWindow2Closed: (() => void) | null = null;
  let cleanupSlushyUploadStatus: (() => void) | null = null;
  let cleanupSlushyUploadProgress: (() => void) | null = null;

  // Sync reset timeout
  let syncResetTimeoutId: number | null = null;

  // Flag to control whether media summary events should be processed
  let vault1Active = false;

  onMount(async () => {
    const res = await fetch('/vaultVars.json');
    configVault = await res.json();

    if (browser) {
      // Only register event listeners if they haven't been registered already
      if (!cleanupMediaSummary) {
        cleanupMediaSummary = window.vaultsyncAPI?.onMediaSummary?.(({ count, sizeMB }) => {
          console.log('🔄 IPC Event - onMediaSummary:', { count, sizeMB });
          // Only process media summary events if vault1 is active
          if (vault1Active) {
            mediaCount.set(count);
            mediaSizeMB.set(sizeMB);
          } else {
            console.log('🚫 Ignoring media summary event - vault1 not active');
          }
        });
      }

      if (!cleanupPopupWindowStatus) {
        cleanupPopupWindowStatus = window.vaultsyncAPI?.onPopupWindowStatus?.(({ vault, status }) => {
          console.log('🪟 IPC Event - onPopupWindowStatus:', { vault, status });
          if (vault === 1 && status === 'closed') {
            console.log('🔄 Vault1 closed - performing comprehensive cleanup');
            vault1Closed.set(true);
            vault1Active = false; // Disable media summary processing
            // Reset media-related properties to zero
            mediaCount.set(0);
            mediaSizeMB.set(0);
            // Reset vault1 state
            vault1State = 'idle';
            vault1Description = selectedVault1Platform === 'Choose platform...' ? `Choose where to fetch your content from` : `Ready to connect to ${selectedVault1Platform}`;
            vault1Instruct = '';
            vault1Instruct2 = '';
          }
          if (vault === 1 && status === 'opened') {
            console.log('🔄 Vault1 opened - enabling media summary processing');
            vault1Active = true; // Enable media summary processing
            vault1Closed.set(false);
          }
          if (vault === 2 && status === 'closed') {
            vault2Closed.set(true);
            vault2State = 'idle'; // 🟢 reset state so reconnect logic works
            // Reset vault2 media-related properties to zero
            vault2MediaCount.set(0);
            vault2MediaSizeMB.set(0);
          }
        });
      }

      if (!cleanupVault2LoginSuccess) {
        cleanupVault2LoginSuccess = window.vaultsyncAPI?.onVault2LoginSuccess?.(() => {
          console.log('✅ IPC Event - onVault2LoginSuccess');
          vault2State = 'done';
          vault2Description = ``;
          if($vault2Closed){
              vault2Description = ``;

          }
          vault2Closed.set(false);
        });
      }

      if (!cleanupPopupWindow2Closed) {
        cleanupPopupWindow2Closed = window.vaultsyncAPI?.onPopupWindow2Closed?.(() => {
          console.log('❌ IPC Event - onPopupWindow2Closed');
          vault2Closed.set(true);
        });
      }

      // Slushy upload event handlers
      if (!cleanupSlushyUploadStatus) {
        cleanupSlushyUploadStatus = window.vaultsyncAPI?.onSlushyUploadStatus?.(({ status, message, error }) => {
          console.log('📤 IPC Event - onSlushyUploadStatus:', { status, message, error });
          uploadStatus = status;
          if (error) {
            console.error('🚨 Upload Error:', error);
          }
        });
      }

      if (!cleanupSlushyUploadProgress) {
        cleanupSlushyUploadProgress = window.vaultsyncAPI?.onSlushyUploadProgress?.(({ current, total, currentFile, bytesTransferred, uploadSpeed }) => {
          console.log('📊 IPC Event - onSlushyUploadProgress:', { 
            current, 
            total, 
            currentFile, 
            bytesTransferred, 
            uploadSpeed,
            percentage: total > 0 ? Math.round((current / total) * 100) : 0
          });
          uploadProgress = {
            current,
            total,
            currentFile: currentFile || '',
            percentage: total > 0 ? Math.round((current / total) * 100) : 0,
            bytesTransferred,
            uploadSpeed
          };
        });
      }
    }

  });

  onDestroy(() => {
    // Clean up event listeners to prevent memory leaks and duplicate events
    cleanupMediaSummary?.();
    cleanupMediaSummary = null;
    
    cleanupPopupWindowStatus?.();
    cleanupPopupWindowStatus = null;
    
    cleanupVault2LoginSuccess?.();
    cleanupVault2LoginSuccess = null;
    
    cleanupPopupWindow2Closed?.();
    cleanupPopupWindow2Closed = null;
    
    cleanupSlushyUploadStatus?.();
    cleanupSlushyUploadStatus = null;
    
    cleanupSlushyUploadProgress?.();
    cleanupSlushyUploadProgress = null;

    // Clear sync reset timeout
    if (syncResetTimeoutId) {
      clearTimeout(syncResetTimeoutId);
      syncResetTimeoutId = null;
    }
  });

  type Phase = 'idle' | 'loading' | 'done' | 'error';
  let vault1State: Phase = 'idle';
  let vault2State: Phase = 'idle';
  let syncState: Phase = 'idle';
  let launchConfetti = false;
  let downloadState: Phase = 'idle';

  $: bothDone = vault1State === 'done' && vault2State === 'done';
  $: syncDisabled = !bothDone || syncState !== 'idle';
  $: subCopy =
    syncState === 'done'
      ? 'Sync complete. Everything’s in harmony.'
      : bothDone
      ? 'Your vaults are connected. Tap Sync when you’re ready.'
      : '';

function connectVault(id: 1 | 2) {
  if (id === 1) {
      mediaCount.set(0);
      mediaSizeMB.set(0);
    // If it was closed, reset state to idle
    if (vault1State !== 'idle') {
      vault1State = 'idle';
    }
    if (vault1State === 'idle') {
      vault1State = 'loading';
      vault1Description = 'Securing access…';
      vault1Instruct = ''; // 🟢 Clear any prior instructions immediately
      vault1Instruct2 = '';
      vault1Closed.set(false);
      vault1Active = true; // Enable media summary processing when connecting
      mediaCount.set(0);
      mediaSizeMB.set(0);
      const selectedPlatform = vault1PlatformOptions.find(p => p.name === selectedVault1Platform);
      const platformUrl = selectedPlatform ? selectedPlatform.url : configVault.vaultOneVars + '.com';
      window.vaultsyncAPI?.openNewWindow?.(
        `https://${platformUrl}/my/vault/list/all`
      );
      setTimeout(() => {
        // Only proceed if still loading (hasn't been canceled or reset)
        if (vault1State === 'loading') {
          vault1State = 'done';
          vault1Description = '';
          vault1Instruct = `Preview and play content in ${selectedVault1Platform}`;
          vault1Instruct2 = `to choose what syncs to Vault 2`;
        }
        vault1Closed.set(false);
      }, 1800);
    }
  }

  if (id === 2) {
  if (vault2State !== 'idle') {
    vault2State = 'idle';
  }
  if (vault2State === 'idle') {
    vault2State = 'loading';
    vault2Description = `Securing access...`;
    vault2Closed.set(false); // 🟢 clear closed flag
    vault2MediaCount.set(0);
    vault2MediaSizeMB.set(0);
    window.vaultsyncAPI.openPopupWindow2();
  }
}
}

  function toggleVault1Dropdown() {
    showVault1Dropdown = !showVault1Dropdown;
    showVault2Dropdown = false; // Close other dropdown
  }

  function toggleVault2Dropdown() {
    showVault2Dropdown = !showVault2Dropdown;
    showVault1Dropdown = false; // Close other dropdown
  }

  function selectVault1Platform(platform) {
    selectedVault1Platform = platform.name;
    showVault1Dropdown = false;
    // Reset vault state when platform changes
    if (vault1State !== 'idle') {
      vault1State = 'idle';
    }
  }

  function selectVault2Platform(platform) {
    selectedVault2Platform = platform.name;
    showVault2Dropdown = false;
    // Reset vault state when platform changes
    if (vault2State !== 'idle') {
      vault2State = 'idle';
    }
  }

  async function startSync() {
    if (syncDisabled) return;
    
    // Clear any existing sync reset timeout
    if (syncResetTimeoutId) {
      clearTimeout(syncResetTimeoutId);
      syncResetTimeoutId = null;
    }
    
    syncState = 'loading';
    try {
      const downloadResult = await window.vaultsyncAPI.uploadMedia();
      if (!downloadResult.folderPath) throw new Error('No folderPath returned from uploadMedia');
      const uploadResult = await window.vaultsyncAPI.uploadMediaFiles(downloadResult.folderPath);
      syncState = 'done';
      launchConfetti = true;
      setTimeout(() => (launchConfetti = false), 2100);
      vault2MediaCount.set($mediaCount);
vault2MediaSizeMB.set($mediaSizeMB);
      
      // Set timeout to reset sync state after 5 seconds
      syncResetTimeoutId = setTimeout(() => {
        // Check if vaults are still connected
        const stillConnected = vault1State === 'done' && vault2State === 'done';
        if (stillConnected) {
          syncState = 'idle';
        }
        // If not connected, sync will remain disabled due to existing syncDisabled logic
        syncResetTimeoutId = null;
      }, 5000);
    } catch (err) {
      console.error('❌ Sync error:', err);
      syncState = 'error';
    }
  }

  async function downloadVaultMedia() {
    if (!window.vaultsyncAPI?.downloadMedia) return;
    downloadState = 'loading';
    try {
      const summary = await window.vaultsyncAPI.downloadMedia();
      mediaCount.set(summary.count);
      mediaSizeMB.set(summary.sizeMB);
      downloadState = 'done';
    } catch {
      downloadState = 'idle';
    }
    setTimeout(() => (downloadState = 'idle'), 2500);
  }

  function openTutorial() {
    showVideoModal = true;
  }
</script>

<div class="wrapper">
  <!-- Top bar -->
  <div class="topbar">
    <div class="topbar-left">
      <button class="dropdown-toggle">
        <svg class:open={showDropdown} width="20" height="20" viewBox="0 0 24 24">
          <line x1="5" y1="7" x2="20" y2="7" />
          <line x1="5" y1="16" x2="20" y2="16" />
        </svg>
      </button>
    </div>
    <div class="topbar-title">

    </div>
    <div class="topbar-right">
      <button class="tutorial-btn" on:click={openTutorial}>
        <svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 -960 960 960" width="12px" fill="#1f1f1f">
          <path d="m380-300 280-180-280-180v360ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
        </svg>
        How it works
      </button>
    </div>
  </div>

  <!-- Vault Cards -->
  <div class="vaults">
    <!-- Vault 1 -->
    <div class="vault-container">
      <div class="vault" on:mouseleave={() => showVault1Dropdown = false}>
        <h2>{vault1Name}</h2>
      <div class="platform-selector">
        <button class="dropdown-btn" on:click={toggleVault1Dropdown}>
          <span class="platform-name" class:placeholder={selectedVault1Platform === 'Choose platform...'}>{selectedVault1Platform}</span>
          <svg class="dropdown-arrow" class:open={showVault1Dropdown} width="12" height="12" viewBox="0 0 12 12">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </button>
        {#if showVault1Dropdown}
          <div class="platform-dropdown">
            {#each vault1PlatformOptions as platform, index}
              <button class="platform-option {index > 0 ? 'disabled' : ''}" 
                      disabled={index > 0}
                      on:click={() => index === 0 ? selectVault1Platform(platform) : null}>
                {platform.name}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; margin-top: 4px; gap: var(--spacing-1);">
        {#if vault1Description}
          <p style="font-size: 13px; margin: 0;">{@html vault1Description}</p>
        {/if}
        {#if vault1Instruct && vault1Instruct2}
          <p style="font-size: 14px; margin: 0; line-height: 1.4; color: #666;">{vault1Instruct}<br>{vault1Instruct2}</p>
        {/if}
      </div>
      {#if $vault1Closed}
        <button class="reconnect" on:click={() => connectVault(1)}>Reconnect</button>
      {:else if vault1State === 'idle'}
        <button class="btn connect" class:disabled-no-platform={selectedVault1Platform === 'Choose platform...'} disabled={selectedVault1Platform === 'Choose platform...'} on:click={() => connectVault(1)}>Connect</button>
      {:else if vault1State === 'loading'}
        <button class="btn disabled"><span class="spinner"></span>&nbsp;Connecting</button>
      {:else if vault1State === 'done'}
        <div class="meta-line">
          <span class="meta">{Math.max(0, $mediaCount -2)} items fetched · {$mediaSizeMB}&nbsp;MB</span>
        </div>
      {/if}
      </div>
    </div>

    <!-- Vault 2 -->
    <div class="vault-container">
      <div class="vault" on:mouseleave={() => showVault2Dropdown = false}>
  <h2>{vault2Name}</h2>
  <div class="platform-selector">
    <button class="dropdown-btn" on:click={toggleVault2Dropdown}>
      <span class="platform-name" class:placeholder={selectedVault2Platform === 'Choose platform...'}>{selectedVault2Platform}</span>
      <svg class="dropdown-arrow" class:open={showVault2Dropdown} width="12" height="12" viewBox="0 0 12 12">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    </button>
    {#if showVault2Dropdown}
      <div class="platform-dropdown">
        {#each vault2PlatformOptions as platform, index}
          <button class="platform-option {index > 1 ? 'disabled' : ''}" 
                  disabled={index > 1}
                  on:click={() => index <= 1 ? selectVault2Platform(platform) : null}>
            {platform.name}
          </button>
        {/each}
      </div>
    {/if}
  </div>
  <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; margin-top: 4px">
    {#if vault2Description}
      <p style="font-size: 13px; margin: 0;">{vault2Description}</p>
    {/if}
  </div>
  {#if $vault2Closed && selectedVault2Platform !== 'Download to this device'}
      <div class="meta-line">
      <span class="meta">
        {Math.max(0, $vault2MediaCount -2)} items added · {$vault2MediaSizeMB}&nbsp;MB
      </span>
    </div>
    <button class="reconnect" on:click={() => connectVault(2)}>Reconnect</button>
    
  {:else if vault2State === 'idle'}

    {#if selectedVault2Platform !== `Download to this device` }
      <button class="btn connect" class:disabled-no-platform={selectedVault2Platform === 'Choose platform...'} disabled={selectedVault2Platform === 'Choose platform...'} on:click={() => connectVault(2)}>Connect</button>
      {:else}
      <button class="btn connect" class:disabled-no-platform={selectedVault2Platform === 'Choose platform...' || $mediaCount === 0} disabled={selectedVault2Platform === 'Choose platform...' || $mediaCount === 0} on:click={downloadVaultMedia}>
        Download
      </button>
    {/if}
  {:else if vault2State === 'loading'}
    <button class="btn disabled"><span class="spinner"></span>&nbsp;Connecting...</button>
  {:else if vault2State === 'done'}
    <button
      class="btn sync {syncState === 'done' ? 'success' : ''} {syncDisabled ? 'disabled' : ''}"
      disabled={syncDisabled}
      on:click={startSync}
      style="margin-top: -9px; margin-bottom: 8px;">
      {#if syncState === 'loading'}<span class="spinner"></span>&nbsp;Syncing
      {:else if syncState === 'done'}&nbsp;Synced
      {:else}Sync{/if}
    </button>
    <div style="margin-top: 2px; margin-bottom: 16px;">
      <p style="font-size: 13px; margin: -2px; color: var(--color-secondary);">Connected to {selectedVault2Platform}</p>
    </div>
    {#if selectedVault2Platform !== 'Download to this device'}
    <div class="meta-line" style="margin-top: -14px;">
      <span class="meta">
        {Math.max(0, $vault2MediaCount)} items added · {$vault2MediaCount}&nbsp;MB
      </span>
    </div>
    {/if}
  {/if}
  </div>
</div>

  </div>

  <!-- Sync Area -->
  <div class="sync-area">
    <p class="sub">{subCopy}</p>
  </div>

  <!-- Upload Progress Display -->
  {#if uploadStatus === 'uploading' && uploadProgress.total > 0}
  <div class="upload-progress">
    <h3>Slushy Upload Progress</h3>
    <div class="progress-bar">
      <div class="progress-fill" style="width: {uploadProgress.percentage}%"></div>
    </div>
    <div class="progress-info">
      <span class="progress-text">{uploadProgress.current} / {uploadProgress.total} files ({uploadProgress.percentage}%)</span>
      {#if uploadProgress.currentFile}
        <span class="current-file">Uploading: {uploadProgress.currentFile}</span>
      {/if}
      {#if uploadProgress.uploadSpeed}
        <span class="upload-speed">Speed: {uploadProgress.uploadSpeed}</span>
      {/if}
    </div>
  </div>
  {/if}

  {#if launchConfetti}
<Confetti amount=50 />
    {/if}
</div>

<!-- Video Modal -->
{#if showVideoModal}
  <div class="video-modal" on:click={() => showVideoModal = false}>
    <div class="video-container" on:click|stopPropagation>
      <button class="close-btn" on:click={() => showVideoModal = false}>×</button>
      <video controls autoplay>
        <source src="/How to Transfer Content Using Novavault.mp4" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    </div>
  </div>
{/if}

<!-- ▸ Styles --------------------------------------------------------- -->
<style>
  /* Import Geist with extended weights and Geist Mono */
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@300;400;500&display=swap');
/* wrapper = one flush capsule */
.apikey-capsule{
  display:flex;
  width:82%;
  margin-left: 25px;           /* keep your original width */
  margin-top:-7px;
  align-items:stretch;  /* button matches input height */
}

/* input = left half */
.apikey-input{
  flex:1;
  padding:0.68rem 1rem;
  font-size:1rem;
  line-height:1.2;
  color:#111;
  background:#fafafa;
  border:1px solid #c7c7c7;
  border-right:none;                    /* seamless join */
  border-radius:50px 0 0 50px;          /* 50 % left, 0 % right */
  white-space:nowrap;
  overflow-x:auto;                      /* ⇠ / ⇢ reveal text */
  text-overflow:ellipsis;
  transition:border .18s ease;
}
.apikey-input:focus{border-color:#000}

/* button = right half, styled like .downloadbtn */
.submitbtn {
  font-size: 21px;
  width: 48px;
  border: 1px solid #000;
  border-left: none;
  border-radius: 0 50px 50px 0;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.submitbtn:hover {
  background: #333;
}

/* icon inside the button */
.submit-icon{
  width:18px;
  height:18px;
  pointer-events:none;
}

/* --- Hint link (“Not sure…”) --- */
.apikey-hint {
  margin: 0.5rem 0 0;
  font-size: 4px;
  color: #757575;
  cursor: pointer;
  user-select: none;
  text-decoration: none;
  transition: color 0.16s ease;
}
.apikey-hint:hover {
  color: #000;
  text-decoration: underline;
}

  
  /* Color System */
  :root {
    --color-primary: #000;
    --color-secondary: #666;
    --color-tertiary: #999;
    --color-background: #fff;
    --color-surface: #fafafa;
    --color-border: #e0e0e0;
    --color-border-hover: #c0c0c0;
    --color-success: #00C851;
    --color-success-hover: #00A944;
    --color-warning: #FF9500;
    --color-info: #007AFF;
    --color-disabled: #f0f0f0;
    --color-disabled-text: #999;
    
    /* 8px Grid Spacing System */
    --spacing-1: 8px;   /* 1 unit */
    --spacing-2: 16px;  /* 2 units */
    --spacing-3: 24px;  /* 3 units */
    --spacing-4: 32px;  /* 4 units */
    --spacing-6: 48px;  /* 6 units */
    --spacing-8: 64px;  /* 8 units */
  }

  /* Global reset & typography */
  html,body{
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-family: 'Geist', sans-serif;
    line-height: 1.5;
    color: var(--color-primary);
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  .wrapper{
    font-family: 'Geist', sans-serif;
    background: var(--color-background);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
           /* Top bar */
  .topbar {
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
  background: #fff;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 999;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.topbar-left,
.topbar-right {
  flex: 1;
  display: flex;
  align-items: center;
}

.topbar-left {
  justify-content: flex-start;
  margin-left: 16px;
}

.topbar-title {
    cursor:pointer;
  flex: 0;
  text-align: center;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  margin-left: -10px;
}

.topbar-right {
  justify-content: flex-end;
}

.dropdown-toggle {
  width: 34px;
  height: 34px;
  border: 1px solid #e0e0e0;
  border-radius: 9999px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor:not-allowed;
  -webkit-app-region: no-drag;
  transition: border 0.2s ease;
}
.dropdown-toggle svg line {
  stroke: #000;               /* explicitly black */
  stroke-width: 2;
  stroke-linecap: round;
  transition: transform 0.25s;
}

.tutorial-btn {
    display: flex;
    align-items: center;
    gap: .5rem;
    padding: .47rem 0.9rem;
    border: 1px solid #e0e0e0;
    background: #fff;
    border-radius: 9999px;
    font-size: 0.8rem;
    font-weight: 400;
    cursor: pointer;
    transition: all .2s ease;
    font-family: inherit;
    color: #666;
    margin-right: 48px;
    -webkit-app-region: no-drag;
}

.tutorial-btn:hover {
  border-color: #646464;
  color: #000;
  background: #fafafa;
}

.dropdown {
  position: absolute;
  right: 1.5rem;
  top: calc(100% + 8px);
  z-index: 10;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(0,0,0,.1);
  font-size: 0.9rem;
  width: 160px;
    cursor: not-allowed;

}

  /* Vaults */
  .vaults{
    margin-top: 54px; /* 10 * 8px - raised */
    display: flex;
    flex-wrap: wrap;
    gap: 32px; /* 4 * 8px */
    justify-content: center;
    max-width: 720px;
    width: 100%;
    padding: 32px; /* 4 * 8px */
  }
  
  /* Vault Container */
  .vault-container{
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative; /* for better control */
  }
  
  
  /* Platform Selector */
  .platform-selector{
    position: relative;
    margin-bottom: var(--spacing-1);
    width: 100%;
    margin-top: 9px;
  }
  
  .dropdown-btn{
    width: 100%;
    padding: 12px 16px; /* 1.5 * 8px, 2 * 8px */
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px; /* 1 * 8px */
    font-size: 0.875rem;
    font-weight: 400;
    color: #111;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.2s ease;
  }
  
  .dropdown-btn:hover{
    border-color: darkgray;
    background: var(--color-surface);
        border: 1px solid #e0e0e0;

  }
  
  .dropdown-btn:focus{
    outline: none;
    border-color: #e0e0e0;
  }
  
  .platform-name{
    font-weight:500;
  }
  
  .platform-name.placeholder {
    color: #999;
    font-style: italic;
    font-weight: 400;
  }
  
  .dropdown-arrow{
    transition:transform 0.2s ease;
    color:#666;
  }
  
  .dropdown-arrow.open{
    transform:rotate(180deg);
  }
  
  .platform-dropdown{
    position:absolute;
    top:100%;
    left:0;
    right:0;
    background:#fff;
    border:1px solid #e0e0e0;
    border-radius:0.5rem;
    box-shadow:0 4px 16px rgba(0,0,0,0.1);
    z-index:10;
    margin-top:0.25rem;
    overflow:hidden;
  }
  
  .platform-option{
    width:100%;
    padding:0.75rem 1rem;
    background:transparent;
    border:none;
    text-align:left;
    font-size:0.875rem;
    font-weight:400;
    color:#111;
    cursor:pointer;
    transition:background 0.15s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  
  .platform-option:hover{
    background: var(--color-surface);
  }
  
  .platform-option:focus{
    outline: none;
    background: var(--color-surface);
  }
  
  .platform-option:active{
    background: var(--color-surface);
    border: none;
  }
  .vault{
    height: 316px; /* minimum height for consistency */
    width: 320px; /* 40 * 8px */
    border: 1px solid var(--color-border);
    border-radius: var(--spacing-2);
    padding: var(--spacing-4);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    position: relative;
  }
  .vault h2{
    margin: 0 0 8px 0; /* 1 * 8px */
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--color-primary);
    letter-spacing: -0.02em;
    min-height: 1.4rem; /* prevent height changes */
  }
  
  .vault p{
    margin: 4px 0 8px 0; /* reduced top margin */
    color: var(--color-secondary);
    font-size: 0.875rem;
    font-weight: 400;
    line-height: 1.4;
    opacity: 0.8;
    min-height: 1.2rem; /* prevent layout shifts */
  }
  .meta-line{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-1);
    margin-top: var(--spacing-2);
    margin-bottom: var(--spacing-1);
  }
  
  .meta{
    font-size: 0.875rem;
    color: var(--color-secondary);
    font-weight: 400;
    transition: color 0.2s ease;
  }
  
  .meta-line:hover .meta {
    color: var(--color-primary);
    cursor: pointer;
  }

  /* Buttons */
  .btn{
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    width: 160px; /* 20 * 8px */
    height: 48px; /* 6 * 8px */
    border: none;
    border-radius: 9999px; /* Pill shape */
    font-size: 0.875rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px; /* 1 * 8px */
    background: #007AFF; /* Blue color */
    color: #fff;
    cursor: pointer;
    letter-spacing: 0.01em;
    margin-top: auto; /* push to bottom */
    margin-left: auto;
    margin-right: auto;
  }
  
  .btn:hover {
    background: #0056CC; /* Darker blue on hover */
    color: #fff;
  }
  
  .btn:focus {
    outline: 2px solid #007AFF;
    outline-offset: 2px;
  }
  
  .btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .reconnect{
    margin-top: auto; /* push to bottom */
    background: transparent;
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    width: 160px; /* 20 * 8px */
    height: 48px; /* 6 * 8px */
    border: 1px solid #007AFF;
    border-radius: 9999px; /* Pill shape */
    font-size: 0.875rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px; /* 1 * 8px */
    color: #007AFF;
    cursor: pointer;
    letter-spacing: 0.01em;
    margin-left: auto;
    margin-right: auto;
  }

  .reconnect:hover {
    background: #007AFF;
    border-color: #007AFF;
    color: #fff;
    transform: translateY(-1px);
  }
  
  .reconnect:focus {
    outline: 2px solid #007AFF;
    outline-offset: 2px;
  }

  
  
  .disabled{
    background: var(--color-disabled) !important;
    color: var(--color-disabled-text) !important;
    cursor: not-allowed;
    opacity: 0.6;
    transform: none !important;
    box-shadow: none !important;
  }

  .disabled-no-platform{
    background: var(--color-disabled) !important;
    color: var(--color-disabled-text) !important;
    cursor: not-allowed;
    opacity: 0.6;
    transform: none !important;
    box-shadow: none !important;
  }
  
  .success{
    background: #00C851 !important;
    color: #fff !important;
    font-weight: 500;
  }
  
  .success:hover{
    background: #00A944 !important;
  }
.downloadbtn {
  width: 19px;
  height: 19px;
  border: none;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #007AFF;
  color: #fff;
  padding: 0;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}

.downloadbtn::before {
  content: '';
  position: absolute;
  width: 150%;
  height: 150%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 10%, transparent 60%);
  border-radius: 50%;
  transition: transform 0.3s ease-out;
  z-index: 0;
}

/* Remove default button glow on hover */
.downloadbtn:hover {
  background:#333;
}

.downloadbtn .download-icon {
  z-index: 1;
  transition: transform 0.3s ease;
    box-shadow: none;

}

.downloadbtn:hover .download-icon {
  transform: none;

}
/* Add glow when .meta-line is hovered */
.meta-line:hover .downloadbtn {
  background:#333;
  color: #fff;
}

/* Disabled state remains the same */
.downloadbtn.disabled {
  background: #c7c7c7;
  cursor: not-allowed;
}
.downloadbtn.disabled .download-icon {
  filter: grayscale(1) opacity(1);
}

.download-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
  display: block;
}


  /* Spinner */
  .spinner-sm {
  width: 11px;
  height: 11px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
  .spinner{width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin .9s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}

  /* Sync area */
  .sync-area{
    text-align: center;
    padding: 32px; /* 4 * 8px */
    max-width: 480px; /* 60 * 8px */
    margin-left: auto;
    margin-top: -37px;
    margin-right: auto;
  }
  
  .sub{
    font-size: 0.875rem;
    color: var(--color-secondary);
    margin-top: 16px; /* 2 * 8px */
    font-weight: 400;
    line-height: 1.5;
    opacity: 0.8;
  }


  /* Video Modal Styles */
  .video-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    cursor: pointer;
  }

  .video-container {
    position: relative;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    cursor: default;
  }

  .video-container video {
    width: 100%;
    height: auto;
    max-height: 90vh;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }

  .close-btn {
    position: absolute;
    top: -40px;
    right: 0;
    background: none;
    border: none;
    color: white;
    font-size: 32px;
    cursor: pointer;
    padding: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;
  }

  .close-btn:hover {
    opacity: 0.7;
  }

  /* Mobile */
  @media(max-width:600px){
    .vaults{
      flex-direction: column;
      gap: 24px; /* 3 * 8px */
      padding: 24px; /* 3 * 8px */
      margin-top: 56px; /* 7 * 8px */
    }
    
    .vault{
      width: 100%;
      max-width: 320px; /* 40 * 8px */
    }
    
    .vault-container{
      width: 100%;
      max-width: 320px; /* 40 * 8px */
    }
    
    .sync-area{
      padding: 24px; /* 3 * 8px */
    }
    
    /* Better touch targets on mobile */
    .btn, .reconnect{
      height: 52px; /* 6.5 * 8px */
      min-height: 44px; /* iOS minimum touch target */
    }
    
    .dropdown-btn{
      height: 52px; /* 6.5 * 8px */
      min-height: 44px; /* iOS minimum touch target */
    }
    
    .platform-option{
      height: 52px; /* 6.5 * 8px */
      min-height: 44px; /* iOS minimum touch target */
    }
  }
  /* ------------- global scroll lock ------------- */
html, body   { margin:0; padding:0; overflow:hidden; }
.wrapper     { overflow-x:hidden; width:100%; max-width:100%; background-color: #fcfcfc }

/* ------------- top bar padding on mobile ------ */
@media (max-width:600px){
  .topbar { padding-inline:1rem; }           /* equal L/R space */
}

/* ------------- vault layout ------------------- */
.vaults{
  display:flex; flex-wrap:wrap; gap:2rem;
  justify-content:center;          /* center rows on wide screens */
  padding:2rem; max-width:720px;   /* new padding = breathing room */
  box-sizing:border-box;
}
@media (max-width:600px){
  .vaults{
    flex-direction:column;         /* stack cards */
    align-items:center;            /* center each card */
    padding-inline:1rem;           /* margin on both sides */
  }
}

/* ------------- vault card --------------------- */
.vault{
  width:320px; max-width:100%;     /* never overflow screen */
  box-sizing:border-box;
  
}

/* ------------- safeguard any stray overflows -- */
*{ max-width:100%; }               /* images / svgs inside stay contained */
.apikey-input {
  width: 80%;
  padding: 0.6rem 1rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  outline: none;
  transition: border 0.2s;
}
.apikey-input:focus {
  border-color: #000;
}

/* Upload Progress Styles */
.upload-progress {
  max-width: 480px;
  margin: 24px auto;
  padding: 24px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  text-align: center;
}

.upload-progress h3 {
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--color-primary);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007AFF, #00C851);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-primary);
}

.current-file {
  font-size: 0.75rem;
  color: var(--color-secondary);
  font-family: 'Geist Mono', monospace;
  word-break: break-all;
}

.upload-speed {
  font-size: 0.75rem;
  color: var(--color-tertiary);
}

@media (max-width: 600px) {
  .upload-progress {
    margin: 16px;
    padding: 16px;
  }
}

.confetti-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999999;
  overflow: visible;
}
</style>
