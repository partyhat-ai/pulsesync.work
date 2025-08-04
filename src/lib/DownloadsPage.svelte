<script>
  import { onMount } from 'svelte';
  import { LicenseResponse } from './schemas.ts';
  
  // Zapier webhook URL - set this in your .env file
  const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/16104307/uudv8ka/' || '';
  const ENABLE_ZAPIER = import.meta.env.PUBLIC_ENABLE_ZAPIER !== 'false'; // default true

  let selectedPlatform = 'mac';
  let licenseToken   = '';
  let licenseError   = '';
  let showActivate   = false;      // show the deep-link button?
  let tooltipText  = 'Click to copy';
  let tooltipState = 'idle'; // 'idle' | 'hover' | 'copied'
  let emailSending = false;
  let emailSent = false;
  let isPolling = false;
  let retryCount = 0;
  let maxRetries = 3;
  let debugMode = false;
  let webhookDebugInfo = null;
  let stripeSuccess = false;
  let userEmail = '';

  /* ───────── platform data ───────── */
  const downloads = {
    mac: {
      name: 'macOS',
      version: '1.0.0',
      size: '42.3 MB',
      requirements: 'macOS 11.0 or later',
      downloadUrl:
        'https://pulsesync-downloads.s3.us-east-1.amazonaws.com/Novavault-1.0.2-arm64-mac.zip'
    },
    windows: {
      name: 'Windows',
      version: '1.0.0',
      size: '38.7 MB',
      requirements: 'Windows 10 or later',
      downloadUrl:
        'https://pulsesync-downloads.s3.us-east-1.amazonaws.com/Novavault.zip'
    }
  };

  onMount(async () => {
    // Check for debug mode in URL params
    const urlParams = new URLSearchParams(window.location.search);
    debugMode = urlParams.get('debug') === 'true';
    
    // Check for Stripe checkout success
    stripeSuccess = urlParams.get('success') === 'true';
    if (stripeSuccess) {
      userEmail = urlParams.get('email') || '';
    }
    
    // Debug environment configuration
    console.log('DEBUG: Zapier configuration on mount', {
      ZAPIER_WEBHOOK_URL: ZAPIER_WEBHOOK_URL || 'NOT SET',
      ENABLE_ZAPIER: ENABLE_ZAPIER,
      hasWebhookUrl: !!ZAPIER_WEBHOOK_URL,
      webhookUrlLength: ZAPIER_WEBHOOK_URL?.length || 0
    });
    
    if (ENABLE_ZAPIER && !ZAPIER_WEBHOOK_URL) {
      console.warn('WARNING: Zapier is enabled but PUBLIC_ZAPIER_WEBHOOK_URL is not set in environment variables');
    }
    
    // Check for token parameter first (direct access)
    const token = urlParams.get('token');
    if (token) {
      // Direct token access - skip license fetching
      licenseToken = token;
      console.log('DEBUG: Direct token access', { token });
      return;
    }
    
    // Fallback to session_id approach
    const sid = urlParams.get('session_id');
    if (!sid) return;
    await fetchLicense(sid);
  });

  async function fetchLicense(sessionId, attempt = 1) {
    try {
      const res = await fetch(
        `https://partyhat-authorization-server-541da1fd5051.herokuapp.com/api/fetch-license?session_id=${sessionId}`
      );
      
      // Handle 202 (pending) - poll with exponential backoff
      if (res.status === 202) {
        if (!isPolling && attempt <= maxRetries) {
          isPolling = true;
          licenseError = 'Processing your license... Please wait.';
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // exponential backoff, max 10s
          setTimeout(() => {
            fetchLicense(sessionId, attempt + 1);
          }, delay);
          return;
        } else {
          licenseError = 'License processing timed out. Please try again or contact support.';
          isPolling = false;
          return;
        }
      }
      
      if (res.status === 404) {
        licenseError = 'Session not found. Please try again or contact support.';
        return;
      }
      
      if (res.status >= 500) {
        licenseError = 'Server error. Please try again later.';
        return;
      }
      
      const json = await res.json();
      const parsed = LicenseResponse.safeParse(json);

      if (!parsed.success) {
        console.error('Bad fetch-license payload', parsed.error, json);
        // Send monitoring event
        console.error('MONITOR: Invalid license response schema', {
          sessionId,
          error: parsed.error,
          response: json
        });
        licenseError = 'Could not verify your license. Please contact support.';
        return;
      }

      const data = parsed.data;
      isPolling = false;
      licenseError = ''; // clear any previous errors
      
      if (res.ok) {
        licenseToken = data.licenseToken;
        
        // Get email with fallback (assuming we might have session data in future)
        const email = data.email; // || $session?.user?.email; // future fallback
        
        // Trigger Zapier webhook for welcome email
        if (ENABLE_ZAPIER && ZAPIER_WEBHOOK_URL && email) {
          emailSending = true;
          triggerZapierWebhook(sessionId, data.licenseToken, email, data)
            .then(() => {
              emailSent = true;
            })
            .finally(() => {
              emailSending = false;
            });
        } else if (ENABLE_ZAPIER && ZAPIER_WEBHOOK_URL && !email) {
          console.warn('MONITOR: Zapier webhook not fired - missing email', {
            sessionId,
            hasWebhookUrl: !!ZAPIER_WEBHOOK_URL,
            email: email || 'missing'
          });
        }
      } else {
        licenseError = json.error || 'Failed to retrieve license.';
      }
    } catch (err) {
      console.error('MONITOR: License fetch error', err, { sessionId, attempt });
      isPolling = false;
      
      if (attempt <= maxRetries) {
        licenseError = `Connection error. Retrying... (${attempt}/${maxRetries})`;
        setTimeout(() => {
          fetchLicense(sessionId, attempt + 1);
        }, 2000);
      } else {
        licenseError = 'Connection error. Please check your internet and try again.';
      }
    }
  }
  
  async function triggerZapierWebhook(sessionId, token, email, licenseData = {}) {
    try {
      console.log('DEBUG: Starting Zapier webhook trigger', {
        webhookUrl: ZAPIER_WEBHOOK_URL,
        hasEmail: !!email,
        email: email,
        sessionId: sessionId
      });
      
      // Create personalized downloads page URL with license token
      const baseUrl = window.location.origin;
      const downloadsPageUrl = `${baseUrl}/?view=downloads&token=${encodeURIComponent(token)}`;
      
      const payload = {
        sessionId,
        licenseToken: token,
        email,
        timestamp: new Date().toISOString(),
        platform: selectedPlatform,
        downloadsPageUrl, // New personalized downloads page link
        downloadUrls: {
          mac: downloads.mac.downloadUrl,
          windows: downloads.windows.downloadUrl
        },
        // Include additional license data
        plan: licenseData.plan,
        status: licenseData.status,
        expiresAt: licenseData.expiresAt
      };
      
      console.log('DEBUG: Zapier webhook payload', JSON.stringify(payload, null, 2));
      
      const response = await fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      console.log('DEBUG: Zapier webhook response', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Try to get response body for debugging
      const responseText = await response.text();
      console.log('DEBUG: Zapier webhook response body', responseText);
      
      if (!response.ok) {
        throw new Error(`Webhook response not ok: ${response.status} - ${responseText}`);
      }
      
      console.log('MONITOR: Zapier webhook triggered successfully', { sessionId, email });
      
      // Store debug info for UI display
      if (debugMode) {
        webhookDebugInfo = {
          success: true,
          url: ZAPIER_WEBHOOK_URL,
          payload: payload,
          response: {
            status: response.status,
            statusText: response.statusText,
            body: responseText
          }
        };
      }
    } catch (error) {
      // Log error but don't throw - this is non-blocking
      console.error('MONITOR: Zapier webhook failed', error, { 
        sessionId, 
        email,
        errorMessage: error.message,
        errorStack: error.stack
      });
      
      // Store debug info for UI display
      if (debugMode) {
        webhookDebugInfo = {
          success: false,
          url: ZAPIER_WEBHOOK_URL,
          error: error.message,
          errorStack: error.stack
        };
      }
    }
  }
  
  function retryLicenseFetch() {
    const sid = new URLSearchParams(window.location.search).get('session_id');
    if (sid) {
      retryCount = 0;
      licenseError = '';
      fetchLicense(sid);
    }
  }

  function handleDownload(platform) {
    window.location.href = downloads[platform].downloadUrl;
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(licenseToken);
      tooltipState = 'copied';
      tooltipText  = 'Copied';
      setTimeout(() => {
        tooltipState = 'idle';
        tooltipText  = 'Click to copy';
      }, 1000);
    } catch {
      tooltipState = 'idle';
      tooltipText  = 'Failed';
    }
  }
  
  async function testWebhook() {
    emailSending = true;
    webhookDebugInfo = null;
    
    const testEmail = prompt('Enter test email address:', 'test@example.com');
    if (!testEmail) {
      emailSending = false;
      return;
    }
    
    const testSessionId = 'test_session_' + Date.now();
    const testToken = 'TEST-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    await triggerZapierWebhook(testSessionId, testToken, testEmail, {
      plan: 'test_plan',
      status: 'active',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    emailSending = false;
    emailSent = true;
  }
    console.log('Env dump', import.meta.env);
</script>

<!-- ───────── HERO ───────── -->
<section class="hero">
  <div class="container">
    <div class="logo">
      <div class="logo-icon-wrapper">
        <img src="/novavault-logo.png" alt="PulseSync logo" class="logo-icon" />
      </div>
      <div class="logo-text">PulseSync</div>
    </div>

    <h1 style="font-weight: 500;">Download for desktop</h1>
    <p class="subtag">Choose your platform:</p>
  </div>
</section>

<!-- ───────── STRIPE SUCCESS MESSAGE ───────── -->
{#if stripeSuccess}
<section class="success-section">
  <div class="container">
    <div class="success-card">
      <div class="success-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="#34C759"/>
          <path d="M10 16l4.5 4.5L22 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h2>Stripe checkout successful</h2>
      <p>License and download link also emailed to <strong>{userEmail}</strong></p>
    </div>
  </div>
</section>
{/if}

<!-- ───────── DOWNLOADS ───────── -->
<section class="downloads-section">
  <div class="container">
    <!-- platform selector -->
    <div class="platform-selector">
      <button
        class="platform-btn {selectedPlatform === 'mac' ? 'active' : ''}"
        on:click={() => (selectedPlatform = 'mac')}
      >
        <svg class="platform-icon" viewBox="0 0 24 24">
          <path
            d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"
          />
        </svg>
        macOS
      </button>

      <button
        class="platform-btn {selectedPlatform === 'windows' ? 'active' : ''}"
        on:click={() => (selectedPlatform = 'windows')}
      >
        <svg class="platform-icon" viewBox="0 0 24 24">
          <path
            d="M3 12V6.75L9 5.43V11.91L3 12M20 3V11.75L10 11.9V5.21L20 3M3 13L9 13.09V19.9L3 18.75V13M20 13.25V22L10 20.09V13.1L20 13.25Z"
          />
        </svg>
        Windows
      </button>
    </div>

    <!-- download card -->
    <div class="download-card">
      <h2>PulseSync for {downloads[selectedPlatform].name}</h2>

      <div class="download-info">
        <div class="info-item"><span class="info-label">Version:</span><span class="info-value">{downloads[selectedPlatform].version}</span></div>
        <div class="info-item"><span class="info-label">Size:</span><span class="info-value">{downloads[selectedPlatform].size}</span></div>
        <div class="info-item"><span class="info-label">Requirements:</span><span class="info-value">{downloads[selectedPlatform].requirements}</span></div>
      </div>

      <!-- always offer installer download -->
      <button
        class="btn btn-secondary download-btn"
        on:click={() => handleDownload(selectedPlatform)}
      >
        Download {downloads[selectedPlatform].name} installer
      </button>

      {#if licenseToken}
        <div class="token-card">
          <h3>Your License Token</h3>
          <div class="token-input-wrapper"
               on:mouseenter={() => tooltipState !== 'copied' && (tooltipState = 'hover')}
               on:mouseleave={() => tooltipState === 'hover' && (tooltipState = 'idle')}
               on:click={copyToken}>
            <input
              id="token"
              class="token-input"
              readonly
              value={licenseToken}
              on:focus={(e) => e.target.select()}
            />
            
            {#if tooltipState !== 'idle'}
              <div class="tooltip {tooltipState}">
                {#if tooltipState === 'hover'}
                  <svg xmlns="http://www.w3.org/2000/svg" class="tooltip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 4H18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  </svg>
                  <span>Click to copy</span>
                {:else if tooltipState === 'copied'}
                  <svg xmlns="http://www.w3.org/2000/svg" class="tooltip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied</span>
                {/if}
              </div>
            {/if}
          </div>
          <p class="token-instructions"><b>Step 1:</b> 
			Download PulseSync.<br>
			<b>Step 2:</b>
			 When prompted, paste your token in the app.
		   </p>
        </div>
        
        {#if emailSending}
          <div class="email-status">
            <svg class="spinner" width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" stroke="#007aff" stroke-width="2" fill="none" stroke-dasharray="50" stroke-dashoffset="0">
                <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="1s" repeatCount="indefinite"/>
              </circle>
            </svg>
            Sending welcome email...
          </div>
        {/if}
        
        {#if emailSent}
          <div class="email-status success">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" fill="#2ecc71"/>
              <path d="M6 10l2.5 2.5L14 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Welcome email sent! Check your inbox.
          </div>
        {/if}
        
        {#if debugMode}
          <div class="debug-section">
            <h4>🛠️ Debug Mode</h4>
            <div class="debug-info">
              <p><strong>Zapier Status:</strong> {ENABLE_ZAPIER ? 'Enabled' : 'Disabled'}</p>
              <p><strong>Webhook URL:</strong> {ZAPIER_WEBHOOK_URL || 'NOT SET'}</p>
              <button class="btn btn-test" on:click={testWebhook} disabled={!ZAPIER_WEBHOOK_URL}>
                Test Webhook
              </button>
            </div>
            
            {#if webhookDebugInfo}
              <div class="webhook-debug-result {webhookDebugInfo.success ? 'success' : 'error'}">
                <h5>{webhookDebugInfo.success ? '✅ Webhook Success' : '❌ Webhook Failed'}</h5>
                <pre>{JSON.stringify(webhookDebugInfo, null, 2)}</pre>
              </div>
            {/if}
          </div>
        {/if}
      {/if}


      {#if licenseError}
        <div class="license-error">
          <p>{licenseError}</p>
          {#if !isPolling && retryCount < maxRetries}
            <button class="btn btn-retry" on:click={retryLicenseFetch}>
              Try Again
            </button>
          {/if}
          {#if licenseError.includes('contact support')}
            <p class="support-link">
Need help? <a href="mailto:support@pulsesync.work" class="link">Contact Support</a>
            </p>
          {/if}
        </div>
      {/if}
      
      {#if isPolling}
        <div class="polling-status">
          <svg class="spinner" width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" stroke="#007aff" stroke-width="2" fill="none" stroke-dasharray="50" stroke-dashoffset="0">
              <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
          Processing your license...
        </div>
      {/if}
    </div>

    <div class="other-downloads">
      <p>Looking for more information?</p>
      <a href="?view=landing" class="link">Check out our overview</a>
    </div>
  </div>
</section>

<!-- ───────── FOOTER ───────── -->
<footer>
  <div class="container footer">
    <span class="logo">
      <div class="logo-icon-wrapper-footer">
        <img src="/novavault-logo.png" alt="PulseSync logo" class="logo-icon-footer" />
      </div>
      <div class="logo-text-footer">PulseSync</div>
    </span>
    <nav class="footer-nav">
      <a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a>
    </nav>
  </div>
</footer>

<style>
  /* Import Geist with specific weights and Geist Mono */
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400&family=Geist+Mono:wght@300;400&display=swap');
 
  /* Token Card */
  .token-card {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 16px;
    padding: 2rem;
    margin: 2rem auto;
    max-width: 100%;
    text-align: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }

  .token-card h3 {
    font-size: 1.25rem;
    font-weight: 400;
    margin-bottom: 1.5rem;
    color: #111;
  }

  .token-input-wrapper {
    position: relative;
    cursor: pointer;
    margin-bottom: 1rem;
  }

  .token-input {
    width: 77%;
    padding: 1.25rem 1.5rem;
    font-family: 'Geist Mono', monospace;
    font-size: 1.5rem;
    font-weight: 400;
    text-align: center;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    background: #fafafa;
    color: #111;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.05em;
  }

  .token-input:hover {
    border-color: #007aff;
    background: #f5f5f5;
  }

  .token-input:focus {
    outline: none;
    border-color: #007aff;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
  }

  .token-instructions {
    font-size: 0.85rem;
    color: #666;
    margin: 0;
    font-weight: 300;
  }

  /* Tooltip */
  .tooltip {
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: #fff;
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: opacity 0.15s;
    white-space: nowrap;
    pointer-events: none;
  }

  .tooltip:after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: #333;
  }

  .tooltip.copied {
    background: #2ecc71;
  }

  .tooltip.copied:after {
    border-top-color: #2ecc71;
  }

  .tooltip-icon {
    width: 16px;
    height: 16px;
    stroke: #fff;
    flex-shrink: 0;
  }

  /* Success Section - Dieter Rams inspired minimalist design */
  .success-section {
    padding: 2rem 0 1rem;
    background: #ffffff;
  }

  .success-card {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 16px;
    padding: 2.5rem 2rem;
    max-width: 480px;
    margin: 0 auto;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .success-icon {
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: center;
  }

  .success-card h2 {
    font-size: 1.5rem;
    font-weight: 500;
    margin: 0 0 1rem 0;
    color: #1d1d1f;
    line-height: 1.2;
  }

  .success-card p {
    font-size: 1rem;
    font-weight: 300;
    color: #6e6e73;
    margin: 0;
    line-height: 1.4;
  }

  .success-card strong {
    font-weight: 400;
    color: #1d1d1f;
  }
  /* Global reset & typography */
  :global(html, body) {
    margin: 0;
    padding: 0;
    font-family: 'Geist', sans-serif;
    line-height: 1.6;
    color: #111;
    overflow-x: hidden;
  }

  /* Container */
  .container {
    max-width: 720px;
    margin: 0 auto;
    padding: 1rem 4rem;
    text-align: center;
  }

  /* Hero */
  .hero {
    padding: 1.75rem 0 2rem;
    position: relative;
	padding-bottom: 0px;
	font-size: 1.9rem;
  }

  .logo {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Geist Mono', monospace;
    font-weight: 300;
    font-size: 1.25rem;
    margin-bottom: 0.68rem;
  }

  .logo-icon-wrapper,
  .logo-icon-wrapper-footer {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-icon {
    height: 17px;
    width: auto;
  }

  .logo-text {
    margin-left: -2px;
  }

  .logo-icon-footer {
    height: 24px;
    width: auto;
  }

  .hero h1 {
    font-size: 1.75rem;
    line-height: 1.1;
    margin: 1rem 0;
  }

  @media screen and (max-width: 540px) {
    .hero h1 {
      font-size: 1.8rem;
    }
  }

  .subtag {
    color: #828282;
    font-size: 1.19rem;
    font-weight: 300;
    line-height: 1.55rem;
  }

  @media screen and (max-width: 540px) {
    .hero .subtag {
      font-size: 1.1rem;
      margin-top: 28px;
      line-height: 1.65rem;
    }
  }

  /* Downloads Section */
  .downloads-section {
    background: #ffffff;
    padding: 0 0 4rem;
  }

  .platform-selector {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 3rem;
    position: relative;
    z-index: 999999;
    isolation: isolate;
  }

  .platform-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: 2px solid #e0e0e0;
    background: #fff;
    border-radius: 9999px;
    font-size: 1rem;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    color: #666;
  }

  .platform-btn:hover {
    border-color: #000;
    color: #000;
  }

  .platform-btn.active {
    background: #000;
    color: #fff;
    border-color: #000;
  }

  .platform-btn.active:hover {
    background: #000;
    color: #fff;
    border-color: #000;
  }

  .platform-btn.active:hover .platform-icon {
    fill: #fff;
  }

  .platform-btn.active .platform-icon {
    fill: #fff;
  }

  .platform-icon {
    width: 20px;
    height: 20px;
    fill: #666;
    transition: fill 0.2s ease;
  }

  .platform-btn:hover .platform-icon {
    fill: #000;
  }

  /* Download Card */
  .download-card {
    background: #f8f8f8;
    border-radius: 1rem;
    padding: 3rem;
    max-width: 480px;
    margin: 0 auto 3rem;
	font-weight: 500;
  }

  .download-card h2 {
    font-size: 1.75rem;
	font-weight: 500;
    margin-bottom: 2rem;
  }

  .download-info {
    text-align: left;
    margin-bottom: 2rem;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid #e0e0e0;
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .info-label {
    color: #666;
    font-weight: 300;
  }

  .info-value {
    font-weight: 400;
  }

  /* Buttons */
  .btn {
    display: inline-block;
    padding: 0.75rem 2rem;
    border-radius: 9999px;
    font-size: 1rem;
    cursor: pointer;
    text-decoration: none;
    font-family: inherit;
    font-weight: 400;
    border: none;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: #000;
    color: #fff;
  }

  .btn-primary:hover {
    background: #333;
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: #007aff;
    color: #fff;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(0, 122, 255, 0.2);
  }

  .btn-secondary:hover {
    background: #0051d5;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
  }

  .download-btn {
    width: 100%;
    max-width: 300px;
	font-weight: 400;
  }

  /* Other Downloads */
  .other-downloads {
    color: #666;
    font-size: 0.95rem;
  }

  .other-downloads p {
    margin-bottom: 0.5rem;
  }

  .link {
    color: #000;
    text-decoration: underline;
    font-weight: 400;
  }

  .link:hover {
    text-decoration: none;
  }

  /* Footer */
  footer {
    background: #fff;
    padding: 2rem 0;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    font-size: 0.875rem;
    width: 378px;
    margin-left: -48px;
  }

  .footer-nav {
    margin: 0 0rem;
    color: #555;
    text-decoration: none;
    font-weight: 300;
    padding-bottom: 7px;
  }

  .footer-nav a {
    margin: 0 0.7rem;
    color: #555;
    text-decoration: none;
    font-weight: 300;
  }

  .footer-nav a:hover {
    color: #000;
  }

  .logo-text-footer {
    margin-left: -2px;
  }

  /* License messages (keep these too) */
  .license-message {
    margin-top: 1rem;
    color: #333;
    font-size: 0.95rem;
    word-break: break-word;
    background: #e7f7ec;
    padding: 0.6rem 1rem;
    border-radius: 0.5rem;
    border-left: 4px solid #2ecc71;
  }

  .license-error {
    margin-top: 1rem;
    color: #b00020;
    font-size: 0.95rem;
    background: #fce4e4;
    padding: 0.6rem 1rem;
    border-radius: 0.5rem;
    border-left: 4px solid #e74c3c;
  }
  
  .license-error p {
    margin: 0 0 0.5rem 0;
  }
  
  .license-error p:last-child {
    margin-bottom: 0;
  }
  
  .btn-retry {
    background: #ff6b6b;
    color: white;
    font-size: 0.85rem;
    padding: 0.5rem 1rem;
    margin-top: 0.5rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
  }
  
  .btn-retry:hover {
    background: #ff5252;
    transform: translateY(-1px);
  }
  
  .support-link {
    font-size: 0.8rem;
    margin-top: 0.5rem;
    color: #666;
  }
  
  .polling-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: #fff3cd;
    border-radius: 8px;
    color: #856404;
    font-size: 0.9rem;
    font-weight: 400;
    border-left: 4px solid #ffc107;
  }
  
  /* Email status styles */
  .email-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: #f0f7ff;
    border-radius: 8px;
    color: #007aff;
    font-size: 0.9rem;
    font-weight: 400;
  }
  
  .email-status.success {
    background: #e7f7ec;
    color: #2ecc71;
  }
  
  .spinner {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* Debug Mode Styles */
  .debug-section {
    margin-top: 2rem;
    padding: 1.5rem;
    background: #f5f5f5;
    border: 2px dashed #999;
    border-radius: 8px;
    text-align: left;
  }
  
  .debug-section h4 {
    margin: 0 0 1rem 0;
    font-size: 1.2rem;
    color: #333;
  }
  
  .debug-info p {
    margin: 0.5rem 0;
    font-size: 0.9rem;
    font-family: 'Geist Mono', monospace;
  }
  
  .btn-test {
    background: #ff9500;
    color: white;
    font-size: 0.9rem;
    padding: 0.5rem 1.5rem;
    margin-top: 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
  }
  
  .btn-test:hover:not(:disabled) {
    background: #e68600;
    transform: translateY(-1px);
  }
  
  .btn-test:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .webhook-debug-result {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
  }
  
  .webhook-debug-result.success {
    background: #e7f7ec;
    border: 1px solid #2ecc71;
  }
  
  .webhook-debug-result.error {
    background: #fce4e4;
    border: 1px solid #e74c3c;
  }
  
  .webhook-debug-result h5 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
  }
  
  .webhook-debug-result pre {
    margin: 0;
    font-size: 0.8rem;
    font-family: 'Geist Mono', monospace;
    white-space: pre-wrap;
    word-break: break-word;
  }
  </style>

