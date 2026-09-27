import { CircleCheck, CircleX } from '@lucide/svelte';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export type ToastItem = {
	id: number;
	kind: ToastKind;
	message: string;
};

let nextId = 1;
let toasts = $state<ToastItem[]>([]);

export function getToasts() {
	return toasts;
}

export function pushToast(kind: ToastKind, message: string, ms = 3500) {
	const id = nextId++;
	toasts = [...toasts, { id, kind, message }];
	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
	}, ms);
}

export const toastIcons = { CircleCheck, CircleX };
