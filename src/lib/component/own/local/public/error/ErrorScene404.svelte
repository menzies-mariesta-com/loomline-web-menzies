<!-- Empty queue: guest looking for a missing ticket. -->
<div class="err-scene relative mx-auto w-full max-w-md select-none" aria-hidden="true">
	<div
		class="pointer-events-none absolute inset-0 rounded-[2rem] opacity-90"
		style="background:
			radial-gradient(ellipse 50% 45% at 78% 22%, var(--loom-mint) 0%, transparent 70%),
			radial-gradient(ellipse 42% 48% at 18% 78%, var(--loom-mint-deep) 0%, transparent 65%);"
	></div>

	<svg
		viewBox="0 0 420 300"
		class="err-scene-art relative z-10 h-auto w-full"
		xmlns="http://www.w3.org/2000/svg"
		role="img"
	>
		<title>Guest searching an empty queue for a missing ticket</title>

		<ellipse cx="340" cy="48" rx="58" ry="40" fill="#9ecbbd" opacity="0.3" />
		<ellipse cx="80" cy="36" rx="44" ry="30" fill="#e8b4a2" opacity="0.18" />

		<path d="M20 250 L20 288 L400 288 L400 210 Z" fill="#b9dccf" opacity="0.55" />

		<!-- Empty queue lane -->
		<path
			d="M90 240 L180 220 L140 180 L240 160 L200 120 L300 100"
			fill="none"
			stroke="#e8f5f0"
			stroke-width="28"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M90 240 L180 220 L140 180 L240 160 L200 120 L300 100"
			fill="none"
			stroke="#ffffff"
			stroke-width="20"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M90 240 L180 220 L140 180 L240 160 L200 120 L300 100"
			fill="none"
			stroke="#3d7a6f"
			stroke-width="1.4"
			stroke-dasharray="4 8"
			stroke-linecap="round"
			opacity="0.22"
		/>

		<!-- Dotted “missing” ticket spots -->
		<g opacity="0.35">
			<rect
				x="168"
				y="188"
				width="16"
				height="20"
				rx="2"
				fill="none"
				stroke="#3d7a6f"
				stroke-width="1.5"
				stroke-dasharray="3 3"
			/>
			<rect
				x="218"
				y="148"
				width="16"
				height="20"
				rx="2"
				fill="none"
				stroke="#3d7a6f"
				stroke-width="1.5"
				stroke-dasharray="3 3"
			/>
			<rect
				x="268"
				y="108"
				width="16"
				height="20"
				rx="2"
				fill="none"
				stroke="#3d7a6f"
				stroke-width="1.5"
				stroke-dasharray="3 3"
			/>
		</g>

		<!-- Soft counter silhouette (distant) -->
		<g opacity="0.55">
			<path d="M48 200 L48 248 L108 248 L108 200 Z" fill="#2a3848" />
			<path d="M44 194 L44 204 L112 204 L112 194 L106 190 L50 190 Z" fill="#3d5166" />
			<rect x="58" y="210" width="36" height="10" rx="2" fill="#3d7a6f" opacity="0.7" />
		</g>

		<!-- Guest looking around -->
		<g class="err-float" transform="translate(300 198)">
			<ellipse cx="0" cy="42" rx="14" ry="5" fill="#2c3e50" opacity="0.14" />
			<rect x="-10" y="8" width="20" height="28" rx="5" fill="#b85c38" />
			<circle cx="0" cy="0" r="9" fill="#c4a484" />
			<!-- Looking left -->
			<circle cx="-3" cy="-1" r="1.4" fill="#2c3e50" />
			<circle cx="4" cy="-1" r="1.4" fill="#2c3e50" />
			<path d="M-6 -10 Q0 -16 8 -8" fill="none" stroke="#2c3e50" stroke-width="2" stroke-linecap="round" />
			<!-- Empty ticket stub in hand -->
			<g transform="translate(14 18) rotate(18)">
				<rect
					x="0"
					y="0"
					width="18"
					height="24"
					rx="2"
					fill="#fff8f0"
					stroke="#3d7a6f"
					stroke-width="1.2"
					stroke-dasharray="3 2"
				/>
				<text
					x="9"
					y="15"
					text-anchor="middle"
					fill="#3d7a6f"
					font-family="Outfit, sans-serif"
					font-size="7"
					font-weight="700"
					opacity="0.45">?</text
				>
			</g>
		</g>

		<!-- Soft question mark in air -->
		<text
			class="err-bob"
			x="248"
			y="88"
			text-anchor="middle"
			fill="#3d7a6f"
			font-family="Fraunces, serif"
			font-size="28"
			font-weight="600"
			opacity="0.35">?</text
		>
	</svg>
</div>
