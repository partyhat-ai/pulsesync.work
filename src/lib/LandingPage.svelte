<script>
	import { injectAnalytics } from '@vercel/analytics/sveltekit'
	/* Animation store */
	import { iconPositions } from '$lib/animate';
	import { onMount } from 'svelte';
	
	let isPhase2Complete = false;
	const scrollPhase2End = 390;
	let isCheckoutLoading = false;
	let checkoutStarted = false;
	let checkoutSuccess = false;

	// Enhanced logging for UI state changes
	const UILogger = {
		phase: (data) => console.log(`🎭 UI PHASE:`, data),
		checkout: (data) => console.log(`💳 CHECKOUT:`, data),
		scroll: (data) => console.log(`📜 SCROLL UI:`, data),
		state: (data) => console.log(`🔄 UI STATE:`, data),
		interaction: (data) => console.log(`👆 USER INTERACTION:`, data)
	};

	// Reactive logging for UI state changes
	$: if (typeof window !== 'undefined') {
		UILogger.phase({
			reactive_update: 'PHASE_2_COMPLETE_CHANGED',
			isPhase2Complete,
			triggered_ui_changes: {
				vault_text: isPhase2Complete ? 'Successfully moved 1.3 GB' : 'Moving 1.3 GB',
				loading_ellipsis_visible: !isPhase2Complete,
				sync_button_state: isPhase2Complete ? 'COMPLETE_WITH_CHECKMARK' : 'LOADING_WITH_SPINNER',
				sync_button_text: isPhase2Complete ? 'Sync Complete' : 'Syncing'
			},
			scroll_position: window.scrollY,
			timestamp: new Date().toISOString()
		});
	}

	$: if (typeof window !== 'undefined') {
		UILogger.checkout({
			reactive_update: 'CHECKOUT_STATES_CHANGED',
			isCheckoutLoading,
			checkoutStarted,
			button_states: {
				primary_button: checkoutStarted ? 'LOADING_WITH_SPINNER' : 'IDLE',
				secondary_button: checkoutStarted ? 'LOADING_WITH_SPINNER' : 'IDLE',
				disabled: isCheckoutLoading
			}
		});
	}
	
	onMount(() => {
		// Initialize Vercel Analytics in production
		if (import.meta.env.PROD) {
			injectAnalytics();
		}
		
		// Log component mount
		UILogger.state({
			event: 'COMPONENT_MOUNTED',
			initial_states: {
				isPhase2Complete,
				isCheckoutLoading,
				checkoutStarted,
				scrollPhase2End
			},
			timestamp: new Date().toISOString()
		});

		// Ensure loading state is reset on mount
		isCheckoutLoading = false;
		checkoutStarted = false;
		
		function handleScroll() {
			const scrollY = window.scrollY;
			const wasPhase2Complete = isPhase2Complete;
			isPhase2Complete = scrollY > scrollPhase2End;
			
			// Log phase transition
			if (wasPhase2Complete !== isPhase2Complete) {
				UILogger.phase({
					phase_transition: isPhase2Complete ? 'ENTERING_PHASE_2' : 'EXITING_PHASE_2',
					scroll_position: scrollY,
					scroll_threshold: scrollPhase2End,
					phase_2_complete: isPhase2Complete,
					ui_changes: {
						text_content: isPhase2Complete ? 'Successfully moved' : 'Moving',
						sync_button: isPhase2Complete ? 'Sync Complete' : 'Syncing',
						loading_ellipsis: !isPhase2Complete
					}
				});
			}
			
			// Periodic scroll logging (every 50px for key positions)
			if (scrollY % 50 === 0 || scrollY === scrollPhase2End) {
				UILogger.scroll({
					scroll_y: scrollY,
					phase_2_threshold: scrollPhase2End,
					phase_2_active: isPhase2Complete,
					scroll_percentage: Math.round((scrollY / 800) * 100) // Assume ~800px total scroll
				});
			}
		}
		
		function handleBeforeUnload() {
			UILogger.state({
				event: 'BEFORE_UNLOAD',
				final_states: { isCheckoutLoading, checkoutStarted, isPhase2Complete }
			});
			isCheckoutLoading = false;
			checkoutStarted = false;
		}
		
		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('beforeunload', handleBeforeUnload);
		handleScroll(); // Initial call with logging
		
		return () => {
			UILogger.state({
				event: 'COMPONENT_CLEANUP',
				removing_event_listeners: true
			});
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});

async function triggerCheckout() {
  if (isCheckoutLoading) {
    UILogger.interaction({
      event: 'CHECKOUT_CLICK_BLOCKED',
      reason: 'Already loading',
      current_state: { isCheckoutLoading, checkoutStarted }
    });
    return;
  }
  
  UILogger.interaction({
    event: 'CHECKOUT_INITIATED',
    user_action: 'button_click',
    phase_2_complete: isPhase2Complete,
    scroll_position: window.scrollY
  });
  
  isCheckoutLoading = true;
  checkoutStarted = true;
  
  UILogger.checkout({
    event: 'CHECKOUT_STATE_CHANGED',
    loading: true,
    started: true,
    timeout_set: '10 seconds'
  });
  
  // Add timeout fallback to reset loading state if redirect doesn't happen
  const timeoutId = setTimeout(() => {
    UILogger.checkout({
      event: 'CHECKOUT_TIMEOUT',
      timeout_duration: '10 seconds',
      resetting_loading_state: true
    });
    isCheckoutLoading = false;
  }, 10000); // 10 seconds timeout
  
  try {
    UILogger.checkout({
      event: 'API_REQUEST_STARTED',
      endpoint: 'create-pulsesync-checkout-session'
    });

    const response = await fetch('https://partyhat-authorization-server-541da1fd5051.herokuapp.com/auth/create-pulsesync-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: 'price_1RlXPwJqxTjvO4cTYeMPSnYG' // replace with your actual Price ID
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    UILogger.checkout({
      event: 'CHECKOUT_RESPONSE_SUCCESS',
      response_data: data,
      has_url: !!data.url,
      clearing_timeout: true
    });

    // Clear timeout since we're about to redirect
    clearTimeout(timeoutId);
    
    // Show checkmark before redirect
    checkoutSuccess = true;
    
    // Wait briefly to show checkmark
    setTimeout(() => {
      // Redirect to Stripe Checkout
      UILogger.checkout({
        event: 'REDIRECTING_TO_STRIPE',
        redirect_url: data.url,
        leaving_page: true
      });
      window.location.href = data.url;
    }, 500);
  } catch (err) {
    clearTimeout(timeoutId);
    UILogger.checkout({
      event: 'CHECKOUT_ERROR',
      error: err.message,
      resetting_loading_state: true
    });
    console.error(err);
    isCheckoutLoading = false;
    checkoutSuccess = false;
  }
}

</script>

<section class="hero">
	<div class="container">
		<div class="logo">
			<div class="logo-icon-wrapper">
				<img src="/novavault-logo.png" alt="PulseSync logo" class="logo-icon" />
			</div>
			<div class="logo-text">PulseSync</div>
		</div>

		<h1>Your Digital Life,<br />Beautifully Preserved.</h1>
		<p class="subtag">The personal vault that understands you.<span class="mobile-break"></span> Store, sync, and access your memories with the intimacy they deserve.</p>
		
		<!-- Rotating Vault Sphere -->
		<div class="vault-sphere-container">
			<div class="vault-sphere">
				<div class="sphere-inner"></div>
				<div class="orbit orbit-1"></div>
				<div class="orbit orbit-2"></div>
				<div class="orbit orbit-3"></div>
			</div>
		</div>
		
		<button on:click={triggerCheckout} class="btn btn-primary" disabled={isCheckoutLoading}>
			{#if checkoutSuccess}
				<svg class="checkmark" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
				</svg>
				Getting Started
			{:else if checkoutStarted}
				<span class="loading-spinner"></span>
				Getting Started
			{:else}
				Get Started Free
			{/if}
		</button>
	</div>
</section>



<section class="features">
	<div class="features-container">
		<!-- Migrate your content section - moved to top of features -->
		<div class="feature-migrate">
			<h2>Made for You</h2>
			<p style="margin-bottom: 1.5rem;">Your photos, videos, and memories deserve a home as unique as you are. Simple, beautiful, yours.</p>
			<button on:click={triggerCheckout} class="btn btn-download" disabled={isCheckoutLoading}>
				{#if checkoutSuccess}
					<svg class="checkmark" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
						<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
					</svg>
					Download Now
				{:else if checkoutStarted}
					<span class="loading-spinner"></span>
					Download Now
				{:else}
					Start your PulseSync
				{/if}
			</button>
		</div>
		<!-- Earn more from every video -->
		<div class="feature feature-earn">
			<div class="feature-image-container-compliance"  style="margin-top: -5px;">
				<img src="/build-in_compliance.png" style="border-radius: 16px;" alt="Earn more from every video" class="feature-image" />
			</div>
			<div class="feature-content">
				<h2>Simply Secure</h2>
				<p>Your personal moments, protected by design.<br> Beautiful encryption that works behind the scenes, so you don't have to think about it.</p>
			</div>
		</div>

		<!-- Pixel-perfect transfers -->
		<div class="feature feature-transfers">
			<div class="feature-content">
				<h2>Everywhere You Are</h2>
				<p>Your memories follow you, effortlessly.<br> From your iPhone to your laptop to that old iPad—everything stays in perfect sync.</p>
			</div>
			<div class="feature-image-container" style="border-radius: 24px;">
				<img src="/pixel-perfect_transfers.png" alt="Pixel-perfect transfers" class="feature-image" />
			</div>
		</div>

		<!-- Built-in compliance -->
		<!-- <div class="feature feature-earn" >
			<div class="feature-image-container">
				<img src="/earn-more-from-every-video.png" style="border-radius: 17px;" alt="Built-in compliance" class="feature-image" />
			</div>
			<div class="feature-content" style="margin-top: -7px">
				<h2>Earn more from every video</h2>
				<p>New channels mean new revenue streams.<br> Turn every upload into fresh income.</p>
			</div>
		</div> -->
	</div>
</section>

<section class="cta-dark">
	<div class="cta-container">
		<h2>Your life.<br />Your way.</h2>
				<button class="btn btn-secondary_bottom" on:click={triggerCheckout} disabled={isCheckoutLoading}>
			{#if checkoutSuccess}
				<svg class="checkmark checkmark-dark" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
				</svg>
				Starting sync
			{:else if checkoutStarted}
				<span class="loading-spinner loading-spinner-dark"></span>
				Starting sync
			{:else}
				Start your PulseSync today
			{/if}
		</button>

	</div>
</section>

<footer>
	<div class="container footer" style="padding: 0;">
		<span class="logo">
			<div class="logo-icon-wrapper-footer">
				<img src="/novavault-logo.png" alt="PulseSync logo" class="logo-icon-footer" />

			</div>
			<div class="logo-text-footer">PulseSync</div>
		</span>

		<nav class="footer-nav">
			<span style="color: #555; margin: 0 0.7rem; cursor: default;">Privacy</span>
			<span style="color: #555; margin: 0 0.7rem; cursor: default;">Terms</span>
			<a href="mailto:support@pulsesync.work">Contact</a>
		</nav>
	</div>
</footer>

<style>
    	/* Import SF Pro for early 2000s Apple aesthetic */
	@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap');

	/* Global reset & typography - Early 2000s Apple style */
	:global(html, body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
		line-height: 1.6;
		color: #333;
		background: #f5f5f7;
          overflow-x: hidden;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	/* Container */
	.container {
		max-width: 720px;
		margin: 0 auto;
		padding: 5rem 4rem;
		text-align: center;
	}

	/* CTA Dark Container - separate from main container */
	.cta-container {
		max-width: 720px;
		margin: 0 auto;
		padding: 5rem 1rem;
		text-align: center;
	}

	/* Hero */
	.hero {
		padding: 3rem 0 4.5rem;
		position: relative;
		background: linear-gradient(180deg, 
			#ffffff 0%, 
			#f5f5f7 100%);
	}

	.logo {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
		font-weight: 400;
		font-size: 1.25rem;
		margin-bottom: 0.68rem;
		color: #333;
		letter-spacing: -0.01em;
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
		position: relative;
	}

	.logo-text::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		width: 0;
		height: 1px;
		background: linear-gradient(90deg, 
			#66CCFF 0%, 
			#3399FF 100%);
		transition: width 0.3s ease;
	}

	.logo:hover .logo-text::after {
		width: 100%;
	}

	.logo-icon-footer {
		height: 18px;
		width: auto;
	}

	.hero h1 {
		font-size: 3rem;
		line-height: 1.1;
		margin: 1rem 0;
		font-weight: 400;
		letter-spacing: -0.03em;
		background: linear-gradient(135deg, #333 0%, #555 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	@media screen and (max-width: 540px) {
		.hero h1 {
			font-size: 1.8rem;
			font-weight: 500;
            
		}
	}

    .h3 { font-weight: 500;}
	.subtag {
		color: #666;
		font-size: 1.3rem;
		margin-bottom: 2rem;
		font-weight: 400;
		line-height: 1.65rem;
		letter-spacing: -0.01em;
	}

	/* Mobile-only line break */
	.mobile-break {
		display: none;
	}

	@media screen and (min-width: 540px) {
		.mobile-break {
			display: block;
		}
	}

    .subtagHighlight {
		color: #828282;
		font-size: 1rem;
		margin-bottom: 2rem;
		font-weight: 300;
		line-height: 1.55rem;
	}

    	@media screen and (max-width: 540px) {
		.hero .subtag {
			font-size: 1.1rem;
            margin-top: 28px;
            line-height: 1.65rem ;

		}
	}

	/* Floating Icon Layer */
.icon-layer {
  position: fixed;
  top: 220px;
  left: 50%;
  transform: translateX(-50%);
  width: 720px;   /* fixed */
  height: 800px;
  z-index: 5;
  pointer-events: none;
}
	.floaty-icon {
		position: absolute;
		width: 50px;
		height: 50px;
		pointer-events: none;
	}

	/* Translucent iMac G3-inspired Sphere */
	.vault-sphere-container {
		position: relative;
		width: 200px;
		height: 200px;
		margin: 3rem auto 2rem;
		perspective: 800px;
	}

	.vault-sphere {
		position: relative;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
		animation: gentleRotate 30s ease-in-out infinite;
	}

	.sphere-inner {
		position: absolute;
		width: 140px;
		height: 140px;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: radial-gradient(circle at 30% 30%, 
			rgba(255, 255, 255, 0.8) 0%, 
			rgba(102, 204, 255, 0.3) 40%, 
			rgba(51, 153, 255, 0.2) 100%);
		border-radius: 50%;
		box-shadow: 
			0 0 40px rgba(102, 204, 255, 0.5),
			inset -20px -20px 40px rgba(255, 255, 255, 0.4),
			inset 20px 20px 40px rgba(102, 204, 255, 0.3);
		backdrop-filter: blur(20px);
		border: 2px solid rgba(255, 255, 255, 0.5);
		animation: gentlePulse 4s ease-in-out infinite;
		overflow: hidden;
	}

	.sphere-inner::before {
		content: '';
		position: absolute;
		width: 100%;
		height: 100%;
		top: -50%;
		left: -50%;
		background: linear-gradient(45deg, 
			transparent 30%, 
			rgba(255, 255, 255, 0.1) 50%, 
			transparent 70%);
		transform: rotate(0deg);
		animation: iridescence 8s linear infinite;
	}

	.orbit {
		position: absolute;
		width: 100%;
		height: 100%;
		border: 1px solid rgba(102, 204, 255, 0.15);
		border-radius: 50%;
		box-shadow: 0 0 20px rgba(102, 204, 255, 0.2);
	}

	.orbit-1 {
		transform: rotateX(70deg) rotateY(0deg);
		animation: softOrbit 20s ease-in-out infinite;
	}

	.orbit-2 {
		transform: rotateX(70deg) rotateY(120deg);
		animation: softOrbit 25s ease-in-out infinite reverse;
	}

	.orbit-3 {
		transform: rotateX(70deg) rotateY(240deg);
		animation: softOrbit 30s ease-in-out infinite;
	}

	@keyframes gentleRotate {
		0%, 100% { transform: rotateY(0deg) rotateX(5deg); }
		50% { transform: rotateY(180deg) rotateX(5deg); }
	}

	@keyframes softOrbit {
		0%, 100% { transform: rotateZ(0deg) rotateX(70deg); }
		50% { transform: rotateZ(180deg) rotateX(70deg); }
	}

	@keyframes gentlePulse {
		0%, 100% { 
			transform: translate(-50%, -50%) scale(1);
			filter: brightness(1);
		}
		50% { 
			transform: translate(-50%, -50%) scale(1.02);
			filter: brightness(1.1);
		}
	}

	@keyframes iridescence {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Mobile adjustments for sphere */
	@media screen and (max-width: 540px) {
		.vault-sphere-container {
			width: 150px;
			height: 150px;
			margin: 2rem auto 1.5rem;
		}

		.sphere-inner {
			width: 90px;
			height: 90px;
		}
	}

	/* Translucent highlight box - iMac G3 inspired */
	.gray-box {
		position: relative;
		height: 290px;
		margin-inline: 1rem;
		padding-block: 2rem;
		padding-inline: 1rem;
		border-radius: 2rem;
		overflow: visible;
		background: radial-gradient(ellipse at top, 
			rgba(102, 204, 255, 0.08) 0%,
			rgba(255, 255, 255, 0.95) 40%,
			rgba(245, 245, 247, 0.98) 100%);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.8);
		box-shadow: 
			0 4px 20px rgba(0, 0, 0, 0.05),
			inset 0 1px 2px rgba(255, 255, 255, 0.9);
	}

    @media screen and (min-width: 720px) {
  .gray-box {
    border-radius: 5rem;       /* rounder corners */
    margin-inline: 4rem;       /* fatter gap on sides */
  }
}
	.gray-box-content {
		max-width: 720px;
		margin: 0 auto;
		position: relative;
		height: 100%;
	}

	/* Centered translucent glass highlight card */
	.highlight-card {
		position: absolute;
		bottom: -8.1rem;
		left: 50%;
        width: 290px;
		transform: translateX(-50%);
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(20px);
		border-radius: 1rem;
		box-shadow: 
			0 8px 24px rgba(0, 0, 0, 0.1),
			inset 0 1px 2px rgba(255, 255, 255, 0.9),
			inset 0 -1px 2px rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.8);
		max-width: 320px;
		padding: 1rem;
		text-align: center;
        z-index: 20;
	}

	/* White backing div underneath highlight-card */
	.white-backing {
		position: absolute;
		bottom: -49rem;
		left: 50%;
		width: 100vw;
		height: 700px;
		transform: translateX(-50%);
		background: #fff;
		border-radius: 1rem;
		max-width: 320px;
		z-index: 10;
	}
/* Make the highlight button a flex container */
  .highlight-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    pointer-events: none;
    cursor: default;
  }
  
  .highlight-btn:hover {
    background: linear-gradient(135deg, #00C851 0%, #00A944 100%) !important;
    transform: none !important;
  }

  /* Spinner & Checkmark: same size & positioning */
  .highlight-spinner,
  .highlight-checkmark {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    left: 79px;
    margin-right: 17px; /* exactly offset the text */
    display: inline-block;
  }

  /* Spinner styling */
  .highlight-spinner {
    border: 2px solid rgb(100, 255, 107);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* --- NEW: independently nudge the text up --- */
.highlight-btn-text {
  position: relative;
  display: inline-block;
    left: -12px;

}

  /* --- NEW: independently nudge the text up --- */
.highlight-btn-text-complete {
  position: relative;
  display: inline-block;
    left: 10px;

}



  /* Button text */
  .highlight-btn-text {
    display: inline-block;
  }
	/* Loading ellipsis animation */
	.loading-ellipsis {
		display: inline-block;
		width: 20px;
		text-align: left;
	}

	.loading-ellipsis:after {
		content: '.';
		animation: ellipsis 1.3s infinite;
	}

	@keyframes ellipsis {
		0% { content: '.'; }
		33% { content: '..'; }
		66% { content: '...'; }
	}

	/* Checkmark styling */
	.highlight-checkmark {
		position: absolute;
		/* top: 50%;
		left: 16%; */
		width: 20px;
        left: 92px;
		height: 20px;
		/* transform: translate(-50%, -50%); */
		z-index: 10;
	}

	/* Migrate content feature styling */
	.feature-migrate {
		text-align: center;
		max-width: 800px;
		margin: 0 auto 30px;
		padding: 0 48px;
	}

	.feature-migrate h2 {
		font-size: 2.25rem;
		margin-bottom: 0.75rem;
		font-weight: 400;
		letter-spacing: -0.02em;
		background: linear-gradient(135deg, #333 0%, #555 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-top: -1px;
		line-height: 1.3;
	}

	.feature-migrate p {
		color: #666;
		font-size: 1.25rem;
		font-weight: 400;
		line-height: 1.65;
		letter-spacing: -0.01em;
		margin: 0;
		margin-bottom: 2rem;
	}

	/* Download button - Apple-inspired design */
	.btn-download {
		background: linear-gradient(135deg, #66CCFF 0%, #3399FF 100%);
		color: #fff;
		margin-top: 0;
		font-size: 1.125rem;
		padding: 1rem 2.5rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		border-radius: 9999px;
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
		box-shadow: 
			0 4px 16px rgba(102, 204, 255, 0.3),
			inset 0 1px 2px rgba(255, 255, 255, 0.4);
		position: relative;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.3);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.btn-download::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.btn-download:hover:not(:disabled) {
		background: linear-gradient(135deg, #5CBEFF 0%, #2E8CFF 100%);
		transform: translateY(-1px) scale(1.02);
		box-shadow: 
			0 8px 24px rgba(102, 204, 255, 0.4),
			inset 0 1px 3px rgba(255, 255, 255, 0.5);
	}

	.btn-download:hover:not(:disabled)::before {
		opacity: 1;
	}

	.btn-download:active:not(:disabled) {
		transform: translateY(-1px) scale(1.01);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	}

	.btn-download:disabled {
		cursor: default;
		opacity: 0.85;
		transform: none;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.6rem 1.2rem;
		border-radius: 9999px;
		font-size: 1rem;
		cursor: pointer;
		text-decoration: none;
		font-family: inherit;
		font-weight: 300;
		border: none;
		transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
	}

	.btn-primary {
		background: rgba(255, 255, 255, 0.7);
		color: #333;
		border: 1px solid rgba(255, 255, 255, 0.9);
		box-shadow: 
			0 2px 8px rgba(0, 0, 0, 0.1),
			inset 0 1px 2px rgba(255, 255, 255, 0.9),
			inset 0 -1px 2px rgba(0, 0, 0, 0.05);
		backdrop-filter: blur(20px);
		position: relative;
		overflow: hidden;
	}

	.btn-primary::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, 
			transparent 0%, 
			rgba(102, 204, 255, 0.2) 50%, 
			transparent 100%);
		transition: left 0.5s ease;
	}

	.btn-primary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.85);
		transform: translateY(-1px) scale(1.02);
		box-shadow: 
			0 4px 16px rgba(0, 0, 0, 0.15),
			inset 0 1px 3px rgba(255, 255, 255, 1),
			inset 0 -1px 3px rgba(0, 0, 0, 0.08);
	}

	.btn-primary:hover:not(:disabled)::before {
		left: 100%;
	}

	.btn-primary:disabled {
		cursor: default;
		opacity: 0.85;
		transform: none;
	}

	/* Features - Early 2000s Apple inspired design */
	.features {
		background: linear-gradient(180deg, 
			#f5f5f7 0%, 
			#ffffff 50%, 
			#f8f9fa 100%);
		padding: 4rem 1rem 6rem;
		position: relative;
		z-index: 15;
	}

	.features-container {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 100px;
	}

	/* Base feature styles */
	.feature {
		display: flex;
		align-items: center;
		gap: 48px;
		transition: transform 0.3s ease, box-shadow 0.3s ease;
	}

	.feature-image-container {
		flex: 0 0 30%;
		overflow: hidden;
	}

	.feature-image-container-compliance {
		flex: 0 0 30%;
		overflow: hidden;
	}

	.feature-image {
		width: 100%;
		height: auto;
		display: block;
		transition: transform 0.3s ease;
		border-radius: 16px;
		filter: brightness(1.05) contrast(1.05);
	}

	.feature-content {
		flex: 1;
	}

	.feature h2 {
		font-size: 1.75rem;
		line-height: 1.4;
		margin-bottom: 1rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		color: #333;
	}

	.feature p {
		color: #666;
		font-size: 1.125rem;
		font-weight: 400;
		line-height: 1.65;
		letter-spacing: -0.01em;
		margin: 0;
	}

	/* Feature 1: Earn more - White rounded container */
	.feature-earn {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(20px);
		border-radius: 48px;
		padding: 48px;
		box-shadow: 
			0 8px 32px rgba(0, 0, 0, 0.08),
			inset 0 1px 2px rgba(255, 255, 255, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.6);
		position: relative;
		overflow: hidden;
	}

	.feature-earn::before {
		content: '';
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: conic-gradient(from 0deg, 
			transparent 0deg, 
			rgba(102, 204, 255, 0.03) 60deg, 
			transparent 120deg);
		animation: shimmer 8s linear infinite;
		pointer-events: none;
	}

	@keyframes shimmer {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.feature-earn:hover {
		transform: translateY(-4px);
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
	}

	.feature-earn .feature-image-container {
		border-radius: 4px;
		overflow: hidden;
		background: #f8f8f8;
	}

	.feature-earn .feature-content {
		text-align: left;
	}

	/* Make earn more from every video image smaller on desktop */
	@media screen and (min-width: 769px) {
		.feature-earn .feature-image-container {
			flex: 0 0 10%;
		}
	}

	/* Feature 2: Pixel-perfect - Transparent background */
	.feature-transfers {
		background: transparent;
		padding: 0 48px;
	}

	.feature-transfers .feature-image-container {
		position: relative;
	}

	.feature-transfers .feature-image {
		border-radius: 16px;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
	}


	.feature-transfers .feature-content {
		text-align: left;
	}

	/* Feature 3: Compliance - Gradient background */
	.feature-compliance {
		background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
		border-radius: 32px;
		padding: 64px 48px;
		flex-direction: column;
		gap: 32px;
		position: relative;
		overflow: hidden;
	}

	.feature-compliance::before {
		content: '';
		position: absolute;
		top: -50%;
		right: -50%;
		width: 200%;
		height: 200%;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
		pointer-events: none;
	}

	.feature-compliance .feature-image-container.centered {
		flex: unset;
		max-width: 111px;
		margin: 0 auto;
		border-radius: 24px;
		overflow: hidden;
		-webkit-transform: translateZ(0);
		transform: translateZ(0);
	}

	.feature-compliance .feature-image {
		filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.1));
	}

	.feature-compliance .feature-content.centered {
		text-align: center;
		max-width: 600px;
		margin: 0 auto;
	}

	/* Delightful earnings section enhancements */
	.delightful-earnings {
		background: #ffffff;
		transition: all 0.4s ease;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	/* Glow effect - removed */
	.glow-orb {
		display: none;
	}

	/* Gradient text - now solid color */
	.gradient-text {
		color: #111;
		font-weight: 600;
		position: relative;
	}

	/* Floating money image - removed animation */
	.floating-money {
		position: relative;
		z-index: 2;
		border-radius: 24px;
	}
	
	/* Mobile-specific border-radius for earn more from every video image */
	@media screen and (max-width: 768px) {
		.floating-money {
			border-radius: 23px;
		}
	}

	/* Sparkles */
	.sparkle {
		position: absolute;
		width: 4px;
		height: 4px;
		background: #ffeb3b;
		border-radius: 50%;
		animation: sparkle 2s ease-in-out infinite;
	}

	.sparkle-1 {
		top: 10px;
		left: 20px;
		animation-delay: 0s;
	}

	.sparkle-2 {
		top: 30px;
		right: 15px;
		animation-delay: 0.7s;
	}

	.sparkle-3 {
		bottom: 20px;
		left: 30px;
		animation-delay: 1.4s;
	}

	@keyframes sparkle {
		0%, 100% {
			opacity: 0;
			transform: scale(0);
		}
		50% {
			opacity: 1;
			transform: scale(1);
			box-shadow: 0 0 10px #ffeb3b, 0 0 20px #ffeb3b;
		}
	}

	/* Money icons */
	.money-icons {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		pointer-events: none;
		z-index: 1;
	}

	.money-icon {
		position: absolute;
		font-size: 36px;
		animation: gentle-drift 12s ease-in-out infinite;
		opacity: 0.8;
	}

	.money-1 {
		top: 10px;
		left: 5%;
		animation-delay: 0s;
	}

	.money-2 {
		top: 30%;
		right: 5%;
		animation-delay: 2s;
	}

	.money-3 {
		bottom: 20px;
		left: 10%;
		animation-delay: 4s;
	}

	.money-4 {
		top: 15%;
		left: 25%;
		animation-delay: 6s;
	}

	.money-5 {
		top: 60%;
		right: 15%;
		animation-delay: 8s;
	}

	.money-6 {
		bottom: 40%;
		left: 40%;
		animation-delay: 10s;
	}

	.money-7 {
		top: 5%;
		right: 25%;
		animation-delay: 1s;
	}

	.money-8 {
		bottom: 10%;
		right: 10%;
		animation-delay: 3s;
	}

	@keyframes gentle-drift {
		0%, 100% {
			transform: translate(0, 0) scale(1);
			opacity: 0.8;
		}
		25% {
			transform: translate(10px, -5px) scale(1.1);
			opacity: 1;
		}
		50% {
			transform: translate(-5px, 10px) scale(0.9);
			opacity: 0.6;
		}
		75% {
			transform: translate(5px, 5px) scale(1.05);
			opacity: 0.9;
		}
	}

	/* Mobile responsive design */
	@media screen and (max-width: 768px) {
		.features {
			padding: 4rem 1rem;
			margin-top: 80px;
		}

		.features-container {
			gap: 60px;
		}

		.feature-migrate {
			padding: 0 24px;
			margin-bottom: 50px;
			margin-top: 20px;
		}

		.feature-migrate h2 {
			font-size: 1.8rem;
			margin-bottom: 0.75rem;
		}

		.feature-migrate p {
			font-size: 1.125rem;
			margin-bottom: 1.75rem;
		}

		.btn-download {
			font-size: 1.05rem;
			padding: 0.875rem 2rem;
		}

		.feature {
			flex-direction: column;
			gap: 32px;
		}

		.feature-image-container {
			flex: unset;
			width: 100%;
			max-width: 320px;
			margin: 0 auto;
		}

		.feature-earn {
			padding: 32px 24px;
			border-radius: 24px;
		}

		.feature-transfers {
			padding: 0;
		}

		.feature-transfers .feature-content {
			order: 2;
		}

		.feature-transfers .feature-image-container {
			order: 1;
		}

		.feature-compliance {
			padding: 48px 24px;
		}

		.feature h2 {
			font-size: 1.5rem;
			margin-top: 1px;
			text-align: center;
		}

		.feature p {
			font-size: 1rem;
			text-align: center;
		}

		.feature-earn .feature-content,
		.feature-transfers .feature-content {
			text-align: center;
		}

		/* Make "earn more from every video" image smaller on mobile */
		.feature-earn:last-child .feature-image-container {
			max-width: 80px;
		}
	}

	/* Small mobile optimization */
	@media screen and (max-width: 480px) {
		.features-container {
			gap: 48px;
		}

		.feature-migrate {
			padding: 0 20px;
			margin-bottom: 40px;
		}

		.feature-migrate h2 {
			font-size: 1.6rem;
			margin-bottom: 0.625rem;
		}

		.feature-migrate p {
			font-size: 1rem;
			margin-bottom: 1.5rem;
		}

		.btn-download {
			font-size: 1rem;
			padding: 0.75rem 1.75rem;
		}

		.feature-earn {
			padding: 24px 20px;
			border-radius: 24px;
		}

		.feature h2 {
			font-size: 1.25rem;
		}

		.feature p {
			font-size: 0.9375rem;
		}
	}

/* CTA Dark */
.cta-dark {
  font-weight: 400;
  position: relative;
  height: auto;
  margin-inline: 1rem;
  padding-block: 3.5rem;
  padding-inline: 1.5rem;
  border-radius: 2rem;
  overflow: visible;
  background: radial-gradient(ellipse at center, 
    rgba(10, 14, 39, 0.95) 0%, 
    rgba(26, 31, 58, 0.9) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(102, 204, 255, 0.3);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.2),
    inset 0 1px 2px rgba(255, 255, 255, 0.1);
  color: #fff;
  margin-top: -7px;
}

@media screen and (min-width: 720px) {
  .cta-dark {
    border-radius: 5rem; /* rounder corners */
    margin-inline: 4rem; /* fatter gap on sides */
  }
}

.cta-dark h2 {
  font-size: 2rem;
  margin-bottom: 2rem;
  line-height: 1.3;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}


	.btn-secondary {
		background: #fff;
		color: #000;
		font-weight: 400;
	}


	/* Mobile-specific styles for CTA dark */
	@media screen and (max-width: 540px) {
		.cta-dark {
			padding-block: 3rem;
			padding-inline: 2rem;
		}
		
		.cta-dark h2 {
			font-size: 1.75rem;
			line-height: 1.25;
			margin-bottom: 1.75rem;
		}
	}
	
	/* Specific handling for 375px screens */
	@media screen and (max-width: 375px) {
		.cta-dark h2 {
			font-size: 1.625rem;
			line-height: 1.3;
			letter-spacing: -0.01em;
		}
	}

	/* Very small screens under 365px */
	@media screen and (max-width: 365px) {
		.cta-dark {
			padding: 5rem 1rem;
		}
	}

	.btn-secondary_bottom {
		background: rgba(255, 255, 255, 0.9);
		color: #333;
		font-weight: 400;
		border: 1px solid rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(20px);
		box-shadow: 
			0 2px 8px rgba(255, 255, 255, 0.2),
			inset 0 1px 2px rgba(255, 255, 255, 0.9);
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
	}


	.btn-secondary_bottom:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.95);
		color: #66CCFF;
		font-weight: 400;
		transform: translateY(-1px) scale(1.02);
		box-shadow: 
			0 4px 16px rgba(255, 255, 255, 0.4),
			inset 0 1px 3px rgba(255, 255, 255, 1);
	}

	.btn-secondary:hover:not(:disabled) {
		background: #eee;
		transform: translateY(-1px);
	}

	.btn-secondary:disabled {
		cursor: default;
		opacity: 0.85;
		transform: none;
	}

	/* Loading spinner */
	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: #fff;
		animation: spin 1s linear infinite;
	}

	.loading-spinner-dark {
		border: 2px solid rgba(0, 0, 0, 0.2);
		border-top-color: #000;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Checkmark styles */
	.checkmark {
		width: 16px;
		height: 16px;
		animation: checkmark-appear 0.3s ease-out;
	}

	.checkmark-dark {
		color: #000;
	}

	@keyframes checkmark-appear {
		from {
			transform: scale(0);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	/* Footer */
	footer {
		background: linear-gradient(180deg, 
			#ffffff 0%, 
			#f5f5f7 100%);
		padding: 2rem 0;
		border-top: 1px solid rgba(0, 0, 0, 0.05);
	}

	.footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		font-size: 0.875rem;
        width: 348px;
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
</style>
