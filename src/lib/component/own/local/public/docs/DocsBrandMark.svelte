<script lang="ts">
	import appIcon from '#lib/asset/image/app-icon-ticket.svg';

	type Props = { size?: 'sm' | 'md' };
	let { size = 'md' }: Props = $props();
	const box = $derived(size === 'md' ? 'size-9' : 'size-8');
	const px = $derived(size === 'md' ? 36 : 32);
</script>

<img
	src={appIcon}
	alt=""
	width={px}
	height={px}
	class="{box} shrink-0"
	aria-hidden="true"
/>
