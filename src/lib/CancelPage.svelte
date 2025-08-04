<script>
	import { onMount } from 'svelte';
</script>

<section class="hero">
	<div class="container">
		<div class="logo">
			<div class="logo-icon-wrapper">
				<img src="/novavault-logo.png" alt="Novavault logo" class="logo-icon" />
			</div>
			<div class="logo-text">Novavault</div>
		</div>

	</div>
</section>

<section class="cancel-section">
	<div class="container">
		<div class="cancel-card">
			<p class="cancel-message">
				Your payment was cancelled and you have not been charged. 
				Feel free to return whenever you're ready.
			</p>
			<div class="actions">
				<a href="/" class="btn btn-secondary">
					Learn more about Novavault
				</a>
			</div>
		</div>

		<div class="support-section">
			<p>Having trouble with checkout?</p>
			<a href="/contact" class="link">Contact our support team</a>
		</div>
	</div>
</section>

<footer>
	<div class="container footer">
		<span class="logo">
			<div class="logo-icon-wrapper-footer">
				<img src="/novavault-logo.png" alt="Novavault logo" class="logo-icon-footer" />
			</div>
			<div class="logo-text-footer">Novavault</div>
		</span>

		<nav class="footer-nav">
			<a href="/privacy">Privacy</a>
			<a href="/terms">Terms</a>
			<a href="/contact">Contact</a>
		</nav>
	</div>
</footer>

<style>
	/* Import Geist with specific weights and Geist Mono */
	@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400&family=Geist+Mono:wght@300;400&display=swap');

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
		padding: 3rem 0 2rem;
		position: relative;
	}

	.logo {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'Geist Mono', monospace;
		font-weight: 400;
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
		font-size: 3rem;
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
		font-size: 1.3rem;
		margin-bottom: 2rem;
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

	/* Cancel Section */
	.cancel-section {
		background: #ffffff;
		padding: 0 0 4rem;
	}

	/* Cancel Card */
	.cancel-card {
		background: #f8f8f8;
		border-radius: 1rem;
		padding: 3rem;
		max-width: 480px;
		margin: 0 auto 3rem;
	}

	.cancel-icon {
		width: 60px;
		height: 60px;
		margin: 0 auto 1.5rem;
		fill: #FF6B6B;
	}

	.cancel-card h2 {
		font-size: 1.75rem;
		margin-bottom: 1rem;
	}

	.cancel-message {
		color: #666;
		font-size: 1rem;
		line-height: 1.6;
		margin-bottom: 2rem;
		font-weight: 300;
	}

	/* Actions */
	.actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
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
		width: 100%;
		max-width: 250px;
		text-align: center;
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
		background: #fff;
		color: #000;
		border: 2px solid #e0e0e0;
	}

	.btn-secondary:hover {
		border-color: #000;
		transform: translateY(-1px);
	}

	/* Support Section */
	.support-section {
		color: #666;
		font-size: 0.95rem;
	}

	.support-section p {
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
</style>