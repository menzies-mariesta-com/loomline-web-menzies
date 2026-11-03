<script lang="ts">
	import frauncesUrl from '#lib/asset/font/fraunces-latin.woff2?url';
	import HomeNav from '#lib/component/own/local/public/home/HomeNav.svelte';
	import HomeFooter from '#lib/component/own/local/public/home/HomeFooter.svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import MenziesLink from '#lib/component/own/local/public/MenziesLink.svelte';

	let { data } = $props();

	const title = $derived(m.privacy_seo_title());
	const description = $derived(m.privacy_seo_description());
	const canonical = $derived(`${data.origin.replace(/\/$/, '')}/privacy`);
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
					{m.privacy_title()}
				</h1>
				<p class="mt-3 text-sm text-[var(--loom-ink)]/55">{m.privacy_updated()}</p>
			</header>

			<p>
				This Privacy Policy explains how <strong>{m.brand_nextup()}</strong> (queue management by
				<MenziesLink />) collects, uses, stores, and shares information when you use our Soft
				Wash marketing site, Cloud SaaS, On-premise deployments we help operate, and related floor surfaces
				(kiosk, TV display, agent desk, and guest ticket links).
			</p>

			<h2>Who we are</h2>
			<p>
				NextUp is a multi-tenant queue management product. Platform operators, business owners, managers,
				agents, and guests interact with different surfaces. Where we process personal data as a service
				provider for a business customer, that business is typically the controller of guest and staff data
				entered into their tenant; we process it to run the product.
			</p>

			<h2>Information we collect</h2>
			<ul>
				<li>
					<strong>Account and auth data.</strong> Name, email, password hashes, session tokens, invite
					tokens, and role or membership metadata (platform admin, owner, manager, agent, device
					accounts).
				</li>
				<li>
					<strong>Business and workspace data.</strong> Organization profile, sites, departments,
					services, queues, counters, devices, messaging and voice settings, and optional uploaded images
					(for example org artwork stored via object storage).
				</li>
				<li>
					<strong>Queue and ticket data.</strong> Ticket numbers and tokens, status history, wait and
					service timestamps, optional guest contact fields you configure (phone, email, or messaging
					handles), appointment details, and related analytics aggregates.
				</li>
				<li>
					<strong>Trial and contact requests.</strong> Name, business details, email, verification codes,
					and the message you send from Pricing or similar public forms.
				</li>
				<li>
					<strong>Technical logs.</strong> IP address, user agent, approximate request metadata, error
					logs, and delivery status for outbox messages (SMS, email, and other channels you enable).
				</li>
			</ul>

			<h2>How we use information</h2>
			<ul>
				<li>Authenticate users and enforce roles across platform, business, and floor surfaces.</li>
				<li>Operate queues: issue tickets, call guests, drive TV/kiosk flows, and sync public ticket status.</li>
				<li>Send transactional messages you configure (invites, OTP codes, ticket updates, voice announce).</li>
				<li>Provide analytics and exports inside your tenant console.</li>
				<li>Host, secure, back up, and improve Cloud infrastructure (including database and object storage).</li>
				<li>Respond to trial requests, support questions, and security incidents.</li>
			</ul>
			<p>We do not sell personal information.</p>

			<h2>Cookies and local storage</h2>
			<p>
				We use cookies and similar storage for signed-in sessions, locale preference, and Soft Wash
				appearance settings. Essential cookies keep you logged in and protect forms. Preference storage may
				remember language and theme so the lobby feels familiar on return. We do not use advertising
				trackers on the marketing shell.
			</p>

			<h2>Hosting, Neon, and subprocessors</h2>
			<p>
				Cloud deployments typically store application data in managed Postgres (for example Neon) and may use
				compatible object storage for images. The app is commonly hosted on a platform such as Netlify.
				Email and SMS may go through SMTP or Twilio (or similar) when configured. On-premise customers keep
				data on infrastructure they control, subject to their own hosting and backup practices, while we may
				still process limited account or support data when you use our Cloud-adjacent services (billing,
				invites, or trial flows).
			</p>

			<h2>Roles and access</h2>
			<p>
				Access is scoped by role. Platform admins manage tenants and templates. Business owners and managers
				configure floors and invite staff. Agents and device accounts see only what their desk or station
				needs. Guests with a ticket link can view status for that ticket token, not other tenants.
			</p>

			<h2>Retention</h2>
			<p>
				We retain account and tenant data while your workspace is active. Ticket and analytics history
				follow product retention settings and operational backups. Trial form records are kept long enough to
				respond and for abuse prevention. When a tenant is closed, we delete or anonymize data according to
				our deletion process and any written agreement, except where law requires longer retention of logs.
			</p>

			<h2>Security</h2>
			<p>
				We use industry-standard measures appropriate to a SaaS product: encrypted transport (HTTPS), hashed
				passwords, role checks, and restricted server access. No method of transmission or storage is
				perfectly secure; report suspected incidents promptly through the channels below.
			</p>

			<h2>Your choices</h2>
			<ul>
				<li>Update profile details in your account settings where available.</li>
				<li>Ask a workspace owner to correct or remove staff accounts you no longer need.</li>
				<li>Guests may ask the business that issued their ticket about guest-facing fields.</li>
				<li>
					Request access, correction, or deletion of personal data we hold as operator by contacting us
					(subject to tenant ownership and legal holds).
				</li>
			</ul>

			<h2>Children</h2>
			<p>
				NextUp is built for business queue operations, not for children under 16 as end users of the
				admin consoles. If you believe we stored a child's data in error, contact us and we will take
				appropriate steps.
			</p>

			<h2>International transfers</h2>
			<p>
				Cloud data may be processed in the regions used by our hosting and database providers. If you need a
				specific residency commitment, document it in your order or On-premise agreement before go-live.
			</p>

			<h2>Contact</h2>
			<p>
				For privacy questions about NextUp, use the trial request form on
				<a href={resolve('/pricing')} class="cursor-pointer">Pricing</a>
				(we respond to the email you verify there), or reply through the support channel listed on your
				workspace invite or order confirmation. There is no separate public support inbox published on this
				site yet; use those verified paths so we can match your tenant safely.
			</p>

			<h2>Changes</h2>
			<p>
				We may update this policy as the product evolves. Material changes will be reflected on this page
				with a revised date. Continued use of the service after an update means you acknowledge the revised
				policy, unless a written contract says otherwise.
			</p>

			<p class="text-sm text-[var(--loom-ink)]/55">{m.legal_disclaimer()}</p>
		</article>
	</main>
	<HomeFooter />
</div>
