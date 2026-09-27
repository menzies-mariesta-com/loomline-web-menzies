<script lang="ts">
	import SearchSelect from './SearchSelect.svelte';
	import { listTimezoneOptions } from '#lib/util/timezones';

	type Props = {
		id: string;
		name?: string;
		value?: string;
		required?: boolean;
		placeholder?: string;
		disabled?: boolean;
		/** When true, empty value is allowed (e.g. timezone override). */
		allowEmpty?: boolean;
		emptyLabel?: string;
	};

	let {
		id,
		name = 'timezone',
		value = $bindable(''),
		required = false,
		placeholder = 'Search timezone...',
		disabled = false,
		allowEmpty = false,
		emptyLabel = 'None (use config)'
	}: Props = $props();

	const options = listTimezoneOptions();
</script>

<SearchSelect
	{id}
	{name}
	{options}
	bind:value
	{required}
	{placeholder}
	filterPlaceholder={placeholder}
	{disabled}
	{allowEmpty}
	{emptyLabel}
	ariaLabel="Timezone"
	mono
/>
