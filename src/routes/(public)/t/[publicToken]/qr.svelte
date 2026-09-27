<script lang="ts">
	/** Lightweight QR via Google Charts API image (no extra npm dep). */
	let { value }: { value: string } = $props();
	const abs = $derived(
		typeof window !== 'undefined' ? new URL(value, window.location.origin).toString() : value
	);
	const src = $derived(
		`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(abs)}`
	);
</script>

<img src={src} width="180" height="180" alt="Ticket QR code" class="rounded-box bg-white p-2" />
