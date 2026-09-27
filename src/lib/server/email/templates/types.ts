/** Soft Wash transactional email payload returned by every scenario template. */
export type EmailMessage = {
	subject: string;
	html: string;
	text: string;
};

export type EmailCta = {
	label: string;
	url: string;
};
