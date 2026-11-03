/** UI + agent actions: must match ticket-machine transitions. */
export function canRecallTicket(status: string): boolean {
	return status === 'called';
}

export function canStartServing(status: string): boolean {
	return status === 'called' || status === 'held';
}

export function canCompleteTicket(status: string): boolean {
	return status === 'serving' || status === 'called';
}

export function canMarkNoShow(status: string): boolean {
	return status === 'waiting' || status === 'called' || status === 'held';
}

export function canHoldTicket(status: string): boolean {
	return status === 'waiting' || status === 'called' || status === 'serving' || status === 'held';
}

export function canCallTicket(status: string): boolean {
	return status === 'waiting';
}

export function isTerminalTicketStatus(status: string): boolean {
	return (
		status === 'completed' ||
		status === 'no_show' ||
		status === 'cancelled' ||
		status === 'transferred'
	);
}

export function agentActionHint(status: string, action: string): string | null {
	if (action === 'recall' && !canRecallTicket(status)) {
		return status === 'waiting' ? 'Call the ticket first' : 'Recall only applies while called';
	}
	if (action === 'serve' && !canStartServing(status)) {
		return status === 'waiting' ? 'Use Call next or Call on this row first' : 'Cannot serve in this state';
	}
	if (action === 'complete' && !canCompleteTicket(status)) {
		return 'Start serving before marking done';
	}
	return null;
}
