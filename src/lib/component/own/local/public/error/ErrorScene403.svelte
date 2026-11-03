<!-- Counter closed: guest stopped at a rope. -->
<div class="err-scene relative mx-auto w-full max-w-md select-none" aria-hidden="true">
	<div
		class="pointer-events-none absolute inset-0 rounded-[2rem] opacity-90"
		style="background:
			radial-gradient(ellipse 48% 44% at 22% 28%, var(--loom-mint) 0%, transparent 70%),
			radial-gradient(ellipse 44% 50% at 82% 72%, var(--loom-mint-deep) 0%, transparent 65%);"
	></div>

	<svg
		viewBox="0 0 420 300"
		class="err-scene-art relative z-10 h-auto w-full"
		xmlns="http://www.w3.org/2000/svg"
		role="img"
	>
		<title>Guest stopped at a rope in front of a closed counter</title>

		<ellipse cx="70" cy="44" rx="52" ry="36" fill="#9ecbbd" opacity="0.28" />
		<ellipse cx="350" cy="40" rx="48" ry="32" fill="#e8b4a2" opacity="0.16" />

		<path d="M18 248 L18 288 L402 288 L402 220 Z" fill="#b9dccf" opacity="0.55" />

		<!-- Closed counter -->
		<g transform="translate(48 150)">
			<ellipse cx="70" cy="128" rx="78" ry="12" fill="#2c3e50" opacity="0.1" />
			<path d="M20 70 L20 130 L120 130 L120 70 Z" fill="#2a3848" />
			<path d="M20 114 L120 114 L120 130 L20 130 Z" fill="#1e2a36" />
			<path d="M14 64 L14 76 L126 76 L126 64 L118 58 L22 58 Z" fill="#3d5166" />
			<path d="M22 58 L118 58 L126 64 L14 64 Z" fill="#4a6278" />

			<!-- Closed shutter over screen -->
			<rect x="40" y="14" width="72" height="52" rx="2" fill="#1a242f" />
			<rect x="44" y="18" width="64" height="44" rx="2" fill="#243140" />
			{#each [0, 1, 2, 3, 4, 5] as i (i)}
				<line
					x1="46"
					y1={22 + i * 7}
					x2="106"
					y2={22 + i * 7}
					stroke="#3d5166"
					stroke-width="2"
				/>
			{/each}

			<rect x="48" y="88" width="56" height="14" rx="2" fill="#c45c48" />
			<text
				x="76"
				y="98"
				text-anchor="middle"
				fill="#ffffff"
				font-family="Outfit, sans-serif"
				font-size="8"
				font-weight="700">CLOSED</text
			>
		</g>

		<!-- Velvet rope posts -->
		<g transform="translate(168 210)">
			<ellipse cx="0" cy="36" rx="10" ry="4" fill="#2c3e50" opacity="0.12" />
			<rect x="-3" y="0" width="6" height="34" rx="2" fill="#c0c8d0" />
			<circle cx="0" cy="-2" r="6" fill="#e07a5f" />
		</g>
		<g transform="translate(268 218)">
			<ellipse cx="0" cy="36" rx="10" ry="4" fill="#2c3e50" opacity="0.12" />
			<rect x="-3" y="0" width="6" height="34" rx="2" fill="#c0c8d0" />
			<circle cx="0" cy="-2" r="6" fill="#e07a5f" />
		</g>
		<path
			d="M168 208 Q218 188 268 216"
			fill="none"
			stroke="#8b3a3a"
			stroke-width="5"
			stroke-linecap="round"
			opacity="0.85"
		/>
		<path
			d="M168 212 Q218 194 268 220"
			fill="none"
			stroke="#c45c48"
			stroke-width="2.5"
			stroke-linecap="round"
			opacity="0.7"
		/>

		<!-- Guest stopped -->
		<g class="err-float" transform="translate(330 198)">
			<ellipse cx="0" cy="42" rx="14" ry="5" fill="#2c3e50" opacity="0.14" />
			<rect x="-10" y="8" width="20" height="28" rx="5" fill="#5b8a9a" />
			<circle cx="0" cy="0" r="9" fill="#a1887f" />
			<circle cx="-3" cy="-1" r="1.3" fill="#2c3e50" />
			<circle cx="3" cy="-1" r="1.3" fill="#2c3e50" />
			<!-- Raised palm: stop -->
			<path d="M14 16 L28 8 L30 12 L18 22 Z" fill="#a1887f" />
			<rect x="26" y="2" width="8" height="12" rx="2" fill="#a1887f" />
		</g>
	</svg>
</div>
