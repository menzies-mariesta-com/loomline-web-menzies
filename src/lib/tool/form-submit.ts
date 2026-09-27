import type { SubmitFunction } from '@sveltejs/kit';

export function bindSubmitting(
	setSubmitting: (v: boolean) => void,
	onResult?: NonNullable<Awaited<ReturnType<SubmitFunction>>>
): SubmitFunction {
	return () => {
		setSubmitting(true);
		return async (input) => {
			try {
				if (onResult) await onResult(input);
				else await input.update();
			} finally {
				setSubmitting(false);
			}
		};
	};
}
