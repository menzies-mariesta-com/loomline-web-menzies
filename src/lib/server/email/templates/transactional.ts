import { escapeHtml } from '#lib/server/email/brand';
import { renderEmailLayout, textFooter } from '#lib/server/email/templates/layout';
import type { EmailCta, EmailMessage } from '#lib/server/email/templates/types';

export type TransactionalFallbackProps = {
	subject: string;
	heading?: string;
	/** Plain paragraphs; each becomes a <p>. */
	bodyLines: string[];
	cta?: EmailCta;
	showHero?: boolean;
	preheader?: string;
};

/** Generic Soft Wash transactional email when no scenario-specific template applies. */
export function transactionalFallbackEmail(props: TransactionalFallbackProps): EmailMessage {
	const heading = props.heading?.trim() || props.subject;
	const text = [...props.bodyLines, textFooter()].join('\n\n');
	const bodyHtml = props.bodyLines
		.map(
			(line) =>
				`<p style="margin:0 0 12px;">${escapeHtml(line).replaceAll('\n', '<br />')}</p>`
		)
		.join('\n');

	const html = renderEmailLayout({
		heading,
		preheader: props.preheader ?? props.subject,
		showHero: props.showHero ?? false,
		cta: props.cta,
		bodyHtml
	});

	return { subject: props.subject, html, text };
}
