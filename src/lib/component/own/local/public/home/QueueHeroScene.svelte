<script lang="ts">
	import { onMount } from 'svelte';

	/** Front → tail slot waypoints (locked positions). */
	const SLOTS = [
		{ x: 168, y: 278 },
		{ x: 210, y: 212 },
		{ x: 310, y: 188 },
		{ x: 280, y: 140 },
		{ x: 390, y: 116 },
		{ x: 362, y: 68 },
		{ x: 488, y: 44 }
	] as const;

	let rootEl = $state<HTMLDivElement | null>(null);
	let ticketNum = $state(13);
	const ticketLabel = $derived(`A${String(ticketNum).padStart(3, '0')}`);

	onMount(() => {
		const root = rootEl;
		if (!root) return;

		const people = Array.from(root.querySelectorAll<SVGGElement>('.qh-person'));
		if (people.length !== SLOTS.length) return;

		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		for (let i = 0; i < people.length; i++) {
			const s = SLOTS[i];
			people[i].setAttribute('transform', `translate(${s.x} ${s.y})`);
		}

		if (reduced) return;

		let order = [...people];
		let cancelled = false;
		let paused = false;
		let ctx: { revert: () => void } | null = null;
		let io: IntersectionObserver | null = null;
		let waitCall: { kill: () => void } | null = null;
		let activeBeat: { kill: () => void; pause: () => void; play: () => void } | null = null;

		void import('gsap').then(({ default: gsap }) => {
			if (cancelled) return;

			ctx = gsap.context(() => {
				for (let i = 0; i < order.length; i++) {
					order[i].removeAttribute('transform');
					gsap.set(order[i], {
						svgOrigin: '0 0',
						x: SLOTS[i].x,
						y: SLOTS[i].y,
						opacity: 1,
						transformOrigin: '50% 100%'
					});
				}

				const scheduleNext = (delay: number) => {
					waitCall?.kill();
					waitCall = gsap.delayedCall(delay, () => {
						waitCall = null;
						if (!cancelled && !paused) step();
					});
				};

				const step = () => {
					if (cancelled || paused) return;

					const front = order[0];
					const rest = order.slice(1);
					const started = performance.now();

					const beat = gsap.timeline({
						onComplete: () => {
							order = [...rest, front];
							activeBeat = null;
							if (cancelled || paused) return;
							const elapsed = (performance.now() - started) / 1000;
							scheduleNext(Math.max(0.05, 2 - elapsed));
						}
					});
					activeBeat = beat;

					beat.to(
						front,
						{
							x: SLOTS[0].x + 56,
							opacity: 0,
							duration: 0.45,
							ease: 'power2.in'
						},
						0
					);

					rest.forEach((el, i) => {
						const target = SLOTS[i];
						beat.to(
							el,
							{
								x: target.x,
								y: target.y,
								duration: 0.7,
								ease: 'power2.inOut'
							},
							0.15 + i * 0.04
						);
					});

					beat.call(() => {
						ticketNum += 1;
					}, [], 0.2);

					const tail = SLOTS[SLOTS.length - 1];
					beat.set(front, { x: tail.x, y: tail.y, opacity: 0 }, 0.5);
					beat.to(
						front,
						{
							opacity: 1,
							duration: 0.4,
							ease: 'power1.out'
						},
						0.55
					);
				};

				step();

				io = new IntersectionObserver(
					(entries) => {
						const visible = entries.some((e) => e.isIntersecting);
						paused = !visible;
						if (!visible) {
							waitCall?.kill();
							waitCall = null;
							activeBeat?.pause();
						} else {
							if (activeBeat) activeBeat.play();
							else if (!waitCall) step();
						}
					},
					{ threshold: 0.15 }
				);
				io.observe(root);
			}, root);
		});

		return () => {
			cancelled = true;
			waitCall?.kill();
			activeBeat?.kill();
			io?.disconnect();
			ctx?.revert();
		};
	});
</script>

<div
	bind:this={rootEl}
	class="qh-scene relative mx-auto w-full max-w-xl select-none"
	aria-hidden="true"
>
	<div
		class="pointer-events-none absolute inset-0 rounded-[2rem] opacity-90"
		style="background:
			radial-gradient(ellipse 50% 45% at 82% 18%, var(--loom-mint) 0%, transparent 70%),
			radial-gradient(ellipse 45% 50% at 18% 82%, var(--loom-mint-deep) 0%, transparent 65%);"
	></div>

	<svg
		viewBox="0 0 560 380"
		class="relative z-10 h-auto w-full"
		xmlns="http://www.w3.org/2000/svg"
		role="img"
	>
		<title>Service counter on the left with a zigzag queue to the right</title>

		<!-- Soft backdrop blobs -->
		<ellipse cx="460" cy="60" rx="70" ry="48" fill="#9ecbbd" opacity="0.32" />
		<ellipse cx="120" cy="40" rx="55" ry="38" fill="#e8b4a2" opacity="0.2" />

		<!-- Floor plane -->
		<path d="M16 300 L16 360 L540 360 L540 250 Z" fill="#b9dccf" opacity="0.55" />

		<!-- Zigzag queue lane -->
		<path
			d="M150 292
				L250 268
				L200 220
				L320 196
				L270 148
				L400 124
				L350 76
				L500 52"
			fill="none"
			stroke="#e8f5f0"
			stroke-width="34"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M150 292
				L250 268
				L200 220
				L320 196
				L270 148
				L400 124
				L350 76
				L500 52"
			fill="none"
			stroke="#ffffff"
			stroke-width="26"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M150 292
				L250 268
				L200 220
				L320 196
				L270 148
				L400 124
				L350 76
				L500 52"
			fill="none"
			stroke="#3d7a6f"
			stroke-width="1.5"
			stroke-dasharray="4 8"
			stroke-linecap="round"
			stroke-linejoin="round"
			opacity="0.25"
		/>

		<!-- ========== SERVICE COUNTER (bottom-LEFT, front faces RIGHT) ========== -->
		<g class="qh-counter">
			<ellipse cx="88" cy="338" rx="78" ry="14" fill="#2c3e50" opacity="0.12" />

			<path d="M28 250 L28 330 L118 330 L118 250 Z" fill="#2a3848" />
			<path d="M28 310 L118 310 L118 330 L28 330 Z" fill="#1e2a36" />
			<path
				d="M22 242 L22 256 L124 256 L124 242 L118 236 L28 236 Z"
				fill="#3d5166"
			/>
			<path d="M28 236 L118 236 L124 242 L22 242 Z" fill="#4a6278" />

			<path d="M28 180 L28 250 L48 250 L48 190 Z" fill="#243140" />
			<rect x="48" y="168" width="70" height="74" rx="2" fill="#1a242f" />

			<rect x="52" y="172" width="62" height="64" rx="3" fill="#5d7388" />
			<rect x="56" y="176" width="54" height="48" rx="2" fill="#b7d0dc" opacity="0.72" />
			<path d="M58 178 L72 178 L64 222 L58 222 Z" fill="#ffffff" opacity="0.35" />
			<rect x="62" y="228" width="42" height="6" rx="1" fill="#0f1720" />
			<path d="M118 248 L148 248 L148 254 L118 254 Z" fill="#4a6278" />
			<path d="M148 248 L156 252 L156 258 L148 254 Z" fill="#3d5166" />

			<g transform="translate(122 198)">
				<rect
					x="0"
					y="0"
					width="52"
					height="38"
					rx="4"
					fill="#0b1220"
					stroke="#5d7388"
					stroke-width="2"
				/>
				<rect x="4" y="4" width="44" height="18" rx="2" fill="#061018" />
				<text
					class="qh-ticket-num"
					x="26"
					y="17"
					text-anchor="middle"
					fill="#7dffc3"
					font-family="Outfit, ui-monospace, monospace"
					font-size="12"
					font-weight="700">{ticketLabel}</text
				>
				<text
					x="26"
					y="32"
					text-anchor="middle"
					fill="#8aa0b2"
					font-family="Outfit, sans-serif"
					font-size="6"
					font-weight="600">NOW SERVING</text
				>
			</g>

			<rect x="48" y="258" width="50" height="16" rx="2" fill="#3d7a6f" />
			<text
				x="73"
				y="269"
				text-anchor="middle"
				fill="#ffffff"
				font-family="Outfit, sans-serif"
				font-size="8"
				font-weight="700">COUNTER 1</text
			>

			<g transform="translate(78 210)">
				<rect x="-14" y="4" width="26" height="22" rx="5" fill="#3d7a6f" />
				<circle cx="-2" cy="-4" r="8" fill="#c4a484" />
				<path d="M-10 -8 Q-2 -16 8 -6 L6 -2 Q-2 -8 -10 -4 Z" fill="#2c3e50" />
				<path d="M10 12 L28 18 L26 22 L8 16 Z" fill="#c4a484" />
			</g>

			<g transform="translate(148 286)">
				<rect x="-3" y="-28" width="6" height="28" rx="2" fill="#c0c8d0" />
				<circle cx="0" cy="-30" r="5" fill="#e07a5f" />
				<ellipse cx="0" cy="2" rx="8" ry="3" fill="#2c3e50" opacity="0.2" />
			</g>
		</g>

		<!-- People: local art only; positions set by GSAP / initial transform in onMount -->
		<!-- Order in DOM = front → tail -->

		<g class="qh-person">
			<ellipse cx="0" cy="38" rx="12" ry="4" fill="#2c3e50" opacity="0.15" />
			<rect x="-9" y="6" width="18" height="26" rx="5" fill="#b85c38" />
			<circle cx="0" cy="-2" r="8" fill="#c4a484" />
			<rect
				x="-18"
				y="14"
				width="10"
				height="13"
				rx="1"
				fill="#fff8f0"
				stroke="#3d7a6f"
				stroke-width="1"
			/>
			<text
				x="-13"
				y="24"
				text-anchor="middle"
				fill="#3d7a6f"
				font-family="Outfit, sans-serif"
				font-size="5"
				font-weight="700">A14</text
			>
		</g>

		<g class="qh-person">
			<ellipse cx="0" cy="38" rx="12" ry="4" fill="#2c3e50" opacity="0.15" />
			<rect x="-9" y="6" width="18" height="26" rx="5" fill="#6b8f71" />
			<circle cx="0" cy="-2" r="8" fill="#c4a484" />
			<path d="M-10 4 L10 4 L8 16 L-8 16 Z" fill="#2c3e50" opacity="0.7" />
		</g>

		<g class="qh-person">
			<ellipse cx="0" cy="38" rx="12" ry="4" fill="#2c3e50" opacity="0.15" />
			<rect x="-9" y="6" width="18" height="26" rx="5" fill="#c45c48" />
			<circle cx="0" cy="-2" r="8" fill="#d7b899" />
			<rect x="-11" y="-4" width="22" height="5" rx="2" fill="#3d7a6f" />
		</g>

		<g class="qh-person">
			<ellipse cx="0" cy="38" rx="12" ry="4" fill="#2c3e50" opacity="0.15" />
			<rect x="-9" y="6" width="18" height="26" rx="5" fill="#5b8a9a" />
			<circle cx="0" cy="-2" r="8" fill="#a1887f" />
			<rect x="6" y="14" width="7" height="9" rx="1" fill="#f4f1ea" />
		</g>

		<g class="qh-person">
			<ellipse cx="0" cy="38" rx="12" ry="4" fill="#2c3e50" opacity="0.15" />
			<rect x="-9" y="6" width="18" height="26" rx="5" fill="#2c3e50" />
			<circle cx="0" cy="-2" r="8" fill="#e0c2a8" />
			<rect x="-7" y="12" width="14" height="10" rx="2" fill="#d8eee6" />
		</g>

		<g class="qh-person">
			<ellipse cx="0" cy="38" rx="12" ry="4" fill="#2c3e50" opacity="0.15" />
			<rect x="-9" y="6" width="18" height="26" rx="5" fill="#e07a5f" />
			<circle cx="0" cy="-2" r="8" fill="#8d6e63" />
			<path d="M-12 2 L12 2 L9 14 L-9 14 Z" fill="#2c3e50" opacity="0.85" />
		</g>

		<g class="qh-person">
			<ellipse cx="0" cy="38" rx="12" ry="4" fill="#2c3e50" opacity="0.15" />
			<rect x="-9" y="6" width="18" height="26" rx="5" fill="#3d7a6f" />
			<circle cx="0" cy="-2" r="8" fill="#c4a484" />
			<rect x="-11" y="-4" width="22" height="5" rx="2" fill="#2c3e50" />
		</g>
	</svg>
</div>
