<!-- Closed lobby: back soon. -->
<div class="err-scene relative mx-auto w-full max-w-md select-none" aria-hidden="true">
	<div
		class="pointer-events-none absolute inset-0 rounded-[2rem] opacity-90"
		style="background:
			radial-gradient(ellipse 50% 48% at 50% 18%, var(--loom-mint) 0%, transparent 72%),
			radial-gradient(ellipse 42% 46% at 16% 78%, var(--loom-mint-deep) 0%, transparent 65%);"
	></div>

	<svg
		viewBox="0 0 420 300"
		class="err-scene-art relative z-10 h-auto w-full"
		xmlns="http://www.w3.org/2000/svg"
		role="img"
	>
		<title>Closed lobby with a back soon sign on the display</title>

		<ellipse cx="210" cy="36" rx="70" ry="40" fill="#9ecbbd" opacity="0.28" />
		<ellipse cx="60" cy="56" rx="40" ry="28" fill="#e8b4a2" opacity="0.14" />

		<path d="M20 250 L20 288 L400 288 L400 228 Z" fill="#b9dccf" opacity="0.5" />

		<!-- Lobby walls hint -->
		<path d="M40 80 L40 250 L120 250 L120 100 Z" fill="#d8eee6" opacity="0.45" />
		<path d="M300 90 L300 250 L380 250 L380 80 Z" fill="#d8eee6" opacity="0.4" />

		<!-- Central counter shuttered -->
		<g transform="translate(140 130)">
			<ellipse cx="70" cy="118" rx="80" ry="12" fill="#2c3e50" opacity="0.1" />
			<path d="M18 60 L18 118 L122 118 L122 60 Z" fill="#2a3848" />
			<path d="M12 54 L12 66 L128 66 L128 54 L120 48 L20 48 Z" fill="#3d5166" />

			<!-- Display: Back soon -->
			<rect x="32" y="4" width="76" height="48" rx="4" fill="#0b1220" stroke="#5d7388" stroke-width="2" />
			<rect x="36" y="8" width="68" height="28" rx="2" fill="#061018" />
			<text
				class="err-bob"
				x="70"
				y="26"
				text-anchor="middle"
				fill="#7dffc3"
				font-family="Outfit, sans-serif"
				font-size="9"
				font-weight="700">BACK SOON</text
			>
			<text
				x="70"
				y="42"
				text-anchor="middle"
				fill="#8aa0b2"
				font-family="Outfit, sans-serif"
				font-size="5"
				font-weight="600">LOBBY CLOSED</text
			>

			<!-- Soft shutter lines -->
			{#each [0, 1, 2] as i (i)}
				<line
					x1="24"
					y1={72 + i * 10}
					x2="116"
					y2={72 + i * 10}
					stroke="#1e2a36"
					stroke-width="3"
					opacity="0.5"
				/>
			{/each}
		</g>

		<!-- Soft clock -->
		<g transform="translate(330 100)">
			<circle cx="0" cy="0" r="22" fill="#fff8f0" stroke="#3d7a6f" stroke-width="2" />
			<circle cx="0" cy="0" r="2" fill="#3d7a6f" />
			<line x1="0" y1="0" x2="0" y2="-12" stroke="#2c3e50" stroke-width="2" stroke-linecap="round" />
			<line x1="0" y1="0" x2="9" y2="4" stroke="#3d7a6f" stroke-width="1.8" stroke-linecap="round" />
		</g>

		<!-- Calm empty stools / waiting marks -->
		{#each [[90, 230], [210, 236], [330, 228]] as [x, y], i ([x, y])}
			<g transform="translate({x} {y})" opacity={0.35 + i * 0.08}>
				<ellipse cx="0" cy="18" rx="12" ry="4" fill="#2c3e50" opacity="0.2" />
				<rect x="-8" y="0" width="16" height="6" rx="2" fill="#3d7a6f" opacity="0.5" />
				<rect x="-2" y="6" width="4" height="12" rx="1" fill="#2a3848" opacity="0.45" />
			</g>
		{/each}
	</svg>
</div>
