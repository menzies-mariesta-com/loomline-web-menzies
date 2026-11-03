<!-- Calm queue silhouette: gentle fallback. -->
<div class="err-scene relative mx-auto w-full max-w-md select-none" aria-hidden="true">
	<div
		class="pointer-events-none absolute inset-0 rounded-[2rem] opacity-90"
		style="background:
			radial-gradient(ellipse 50% 45% at 75% 24%, var(--loom-mint) 0%, transparent 70%),
			radial-gradient(ellipse 44% 48% at 20% 76%, var(--loom-mint-deep) 0%, transparent 65%);"
	></div>

	<svg
		viewBox="0 0 420 300"
		class="err-scene-art relative z-10 h-auto w-full"
		xmlns="http://www.w3.org/2000/svg"
		role="img"
	>
		<title>Calm queue silhouette waiting peacefully</title>

		<ellipse cx="340" cy="46" rx="54" ry="36" fill="#9ecbbd" opacity="0.28" />
		<ellipse cx="70" cy="40" rx="46" ry="30" fill="#e8b4a2" opacity="0.14" />

		<path d="M18 248 L18 288 L402 288 L402 222 Z" fill="#b9dccf" opacity="0.55" />

		<!-- Soft queue lane -->
		<path
			d="M100 236 L170 216 L140 180 L220 160 L190 124 L280 104"
			fill="none"
			stroke="#e8f5f0"
			stroke-width="28"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M100 236 L170 216 L140 180 L220 160 L190 124 L280 104"
			fill="none"
			stroke="#ffffff"
			stroke-width="20"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M100 236 L170 216 L140 180 L220 160 L190 124 L280 104"
			fill="none"
			stroke="#3d7a6f"
			stroke-width="1.3"
			stroke-dasharray="4 8"
			stroke-linecap="round"
			opacity="0.2"
		/>

		<!-- Soft counter -->
		<g transform="translate(36 158)" opacity="0.85">
			<path d="M16 60 L16 118 L100 118 L100 60 Z" fill="#2a3848" />
			<path d="M10 54 L10 66 L106 66 L106 54 L98 48 L18 48 Z" fill="#3d5166" />
			<rect x="34" y="8" width="56" height="36" rx="3" fill="#0b1220" stroke="#5d7388" stroke-width="1.5" />
			<text
				x="62"
				y="30"
				text-anchor="middle"
				fill="#7dffc3"
				font-family="Outfit, ui-monospace, monospace"
				font-size="10"
				font-weight="700">A001</text
			>
		</g>

		<!-- Silhouette people -->
		{#each [
			{ x: 150, y: 198, fill: '#3d7a6f', op: 0.55 },
			{ x: 200, y: 168, fill: '#2c3e50', op: 0.45 },
			{ x: 248, y: 138, fill: '#5b8a9a', op: 0.4 },
			{ x: 298, y: 112, fill: '#6b8f71', op: 0.35 }
		] as p (p.x)}
			<g class="err-float" transform="translate({p.x} {p.y})" opacity={p.op}>
				<ellipse cx="0" cy="38" rx="11" ry="4" fill="#2c3e50" opacity="0.2" />
				<rect x="-8" y="6" width="16" height="24" rx="5" fill={p.fill} />
				<circle cx="0" cy="-2" r="7" fill={p.fill} />
			</g>
		{/each}
	</svg>
</div>
