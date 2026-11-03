<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { MENZIES_WEBSITE_URL } from '#lib/constant/menzies';

	type Props = {
		class?: string;
	};

	let { class: className = '' }: Props = $props();
</script>

<a
	href={MENZIES_WEBSITE_URL}
	class="link-inherit cursor-pointer {className}"
	target="_blank"
	rel="noopener noreferrer"
>
	{m.brand_menzies()}
</a>
