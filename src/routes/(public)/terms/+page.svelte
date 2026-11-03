<script lang="ts">
	import frauncesUrl from '#lib/asset/font/fraunces-latin.woff2?url';
	import HomeNav from '#lib/component/own/local/public/home/HomeNav.svelte';
	import HomeFooter from '#lib/component/own/local/public/home/HomeFooter.svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import MenziesLink from '#lib/component/own/local/public/MenziesLink.svelte';

	let { data } = $props();

	const title = $derived(m.terms_seo_title());
	const description = $derived(m.terms_seo_description());
	const canonical = $derived(`${data.origin.replace(/\/$/, '')}/terms`);
	const ogImage = $derived(`${data.origin.replace(/\/$/, '')}/og-nextup.png`);

	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'WebPage',
			name: title,
			description,
			url: canonical,
			isPartOf: {
				'@type': 'WebSite',
				name: m.brand_nextup(),
				url: data.origin.replace(/\/$/, '')
			}
		})
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={m.brand_nextup()} />
	<meta property="og:image" content={ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
	<link rel="preload" href={frauncesUrl} as="font" type="font/woff2" crossorigin="anonymous" />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<div class="loom-marketing paper-grain min-h-screen">
	<HomeNav />
	<main class="pt-24 sm:pt-28">
		<article class="docs-prose mx-auto max-w-3xl px-4 pb-16 sm:px-6 sm:pb-24">
			<header class="mb-10">
				<p class="text-xs font-semibold tracking-wide text-primary uppercase">{m.brand_nextup()}</p>
				<h1 class="font-display mt-2 text-4xl font-semibold tracking-tight text-[var(--loom-ink)] sm:text-5xl">
					{m.terms_title()}
				</h1>
				<p class="mt-3 text-sm text-[var(--loom-ink)]/55">{m.terms_updated()}</p>
			</header>

			<p>
				These Terms of Service ("Terms") govern access to <strong>{m.brand_nextup()}</strong>, the Soft
				Wash queue management product from <MenziesLink />. By using the marketing site,
				creating an account, accepting an invite, starting a trial, or operating a Cloud or On-premise
				workspace, you agree to these Terms.
			</p>

			<h2>The service</h2>
			<p>
				NextUp provides multi-tenant queue management: business consoles, platform admin tools, kiosk and
				TV floor surfaces, agent desks, guest ticket pages, appointments, messaging outbox, and related
				docs. Features depend on your plan (Cloud or On-premise tiers such as Starter, Business, Scale, or
				Platform) and what your tenant administrators enable.
			</p>

			<h2>Accounts and roles</h2>
			<ul>
				<li>You must provide accurate account information and keep credentials confidential.</li>
				<li>
					Roles (platform admin, owner, manager, agent, device) define what each user or station can do.
					Workspace owners are responsible for who they invite and what guests see on public ticket links.
				</li>
				<li>You must promptly revoke access for people who leave your organization.</li>
			</ul>

			<h2>Acceptable use</h2>
			<p>You agree not to:</p>
			<ul>
				<li>Probe, overload, or disrupt the service, or bypass authentication or role checks.</li>
				<li>Use NextUp to send unlawful spam or abusive messaging through configured channels.</li>
				<li>Upload malware, infringing content, or data you have no right to process.</li>
				<li>Misrepresent your affiliation with <MenziesLink /> or NextUp.</li>
				<li>Resell or white-label the product except under a written partner agreement.</li>
			</ul>

			<h2>Customer data</h2>
			<p>
				You retain rights to the business, queue, and ticket content you put into NextUp. You grant us a
				limited license to host, process, and display that content solely to provide and secure the service.
				Our
				<a href={resolve('/privacy')} class="cursor-pointer">Privacy Policy</a>
				describes how personal data is handled. You are responsible for lawful collection of guest data
				(notices, consent, and industry rules that apply to your lobby).
			</p>

			<h2>Cloud and On-premise</h2>
			<p>
				<strong>Cloud.</strong> We host the multi-tenant Soft Wash application and managed data stores
				(typically Postgres and optional object storage). Availability targets, if any, appear in your order
				or SLA addendum.
			</p>
			<p>
				<strong>On-premise.</strong> You host the application on your infrastructure. You remain responsible
				for servers, databases, network security, backups, and updates on the release path you choose, unless
				a separate support contract says otherwise. Fees for On-premise install and setup follow published
				pricing or your quote.
			</p>

			<h2>Trials and plans</h2>
			<p>
				Trials are time-limited and may be declined or ended if we detect abuse. Paid plans renew according
				to the billing period you select (or your invoice). Taxes and local currency display (when shown)
				are for convenience; the binding commercial terms are those on your invoice or signed order.
			</p>

			<h2>Third-party services</h2>
			<p>
				Optional integrations (for example Twilio SMS, SMTP email, messaging webhooks, or Neon-hosted
				storage) are subject to those providers' terms. We are not responsible for outages or policy changes
				of third parties you enable.
			</p>

			<h2>Intellectual property</h2>
			<p>
				NextUp, Soft Wash UI patterns used in the product, and related trademarks belong to
				<MenziesLink /> or its licensors. These Terms do not transfer ownership of our software. Feedback you share
				may be used to improve the product without obligation to you.
			</p>

			<h2>Disclaimer</h2>
			<p>
				The service is provided "as is" and "as available," to the fullest extent permitted by law. We
				disclaim implied warranties of merchantability, fitness for a particular purpose, and
				non-infringement, except where such disclaimers are not allowed.
			</p>

			<h2>Limitation of liability</h2>
			<p>
				To the fullest extent permitted by law, <MenziesLink /> and its contributors are not liable for
				indirect, incidental, special, consequential, or lost-profit damages, or for lost queue data beyond
				reasonable backup practices described in your plan docs. Our aggregate liability arising from the
				service is limited to the fees you paid us for NextUp in the three months before the claim (or, if
				you are on a free trial with no fees, fifty US dollars). Some jurisdictions do not allow certain
				limits; in those places, our liability is limited to the maximum permitted by law.
			</p>

			<h2>Suspension and termination</h2>
			<p>
				We may suspend or terminate access for unpaid invoices, security risk, or material breach of these
				Terms. You may stop using the service and request tenant closure through your owner account or
				support channel. Provisions that by nature should survive (IP, liability limits, governing law)
				remain in effect.
			</p>

			<h2>Governing law</h2>
			<p>
				Unless a signed order names a different jurisdiction, these Terms are governed by the laws of the
				jurisdiction where <MenziesLink /> principally operates its NextUp commercial entity, without
				regard to conflict-of-law rules. Courts in that place have non-exclusive venue for disputes, subject
				to mandatory consumer protections that cannot be waived.
			</p>

			<h2>Changes</h2>
			<p>
				We may update these Terms as the product and regulations change. The date at the top of this page
				will change when we do. If a change is material and you have a paid workspace, we will aim to notify
				owners by email or in-product notice when practical. Continued use after the effective date
				constitutes acceptance, except where your written contract requires mutual signature for amendments.
			</p>

			<h2>Contact</h2>
			<p>
				Questions about these Terms: use the trial request form on
				<a href={resolve('/pricing')} class="cursor-pointer">Pricing</a>
				with a verified email, or the support channel on your workspace invite or order confirmation. For
				privacy-specific questions, see the
				<a href={resolve('/privacy')} class="cursor-pointer">Privacy Policy</a>.
			</p>

			<p class="text-sm text-[var(--loom-ink)]/55">{m.legal_disclaimer()}</p>
		</article>
	</main>
	<HomeFooter />
</div>
